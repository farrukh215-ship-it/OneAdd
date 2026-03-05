import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { ListingStatus } from "@prisma/client";
import { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";

type SuggestionType = "page" | "category" | "listing" | "chat" | "saved";

type SuggestionItem = {
  id: string;
  type: SuggestionType;
  label: string;
  href: string;
  meta?: string;
};

const PAGE_SUGGESTIONS: Array<{
  id: string;
  label: string;
  href: string;
  keywords: string[];
}> = [
  { id: "home", label: "Home", href: "/", keywords: ["home", "main"] },
  {
    id: "search",
    label: "Dhundo",
    href: "/search",
    keywords: ["search", "dhundo", "find"]
  },
  { id: "sell", label: "Apna Saaman Becho", href: "/sell", keywords: ["sell", "becho"] },
  { id: "reels", label: "Reels", href: "/reels", keywords: ["reels", "video"] },
  { id: "chat", label: "Chat", href: "/chat", keywords: ["chat", "message"] },
  { id: "ads", label: "Mere Ads", href: "/my-listings", keywords: ["ads", "my listings"] }
];

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async getSuggestions(request: Request, query: string, limit = 20) {
    const take = Math.min(Math.max(limit, 5), 50);
    const q = query.trim().toLowerCase();
    const userId = await this.extractUserId(request);

    const [categoryRows, listingRows, chatRows, savedRows] = await Promise.all([
      this.prisma.category.findMany({
        where: q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { slug: { contains: q, mode: "insensitive" } }
              ]
            }
          : undefined,
        orderBy: [{ depth: "asc" }, { name: "asc" }],
        take: 8
      }),
      this.prisma.listing.findMany({
        where: {
          status: ListingStatus.ACTIVE,
          ...(q
            ? {
                OR: [
                  { title: { contains: q, mode: "insensitive" } },
                  { description: { contains: q, mode: "insensitive" } }
                ]
              }
            : {})
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          currency: true,
          price: true
        },
        take: 8
      }),
      userId
        ? this.prisma.chatThread.findMany({
            where: {
              OR: [{ buyerId: userId }, { sellerId: userId }],
              listing: q
                ? {
                    title: { contains: q, mode: "insensitive" }
                  }
                : undefined
            },
            orderBy: { lastMessageAt: "desc" },
            take: 5,
            select: {
              id: true,
              listing: {
                select: { id: true, title: true }
              }
            }
          })
        : Promise.resolve([]),
      userId
        ? this.prisma.savedListing.findMany({
            where: {
              userId,
              listing: q
                ? {
                    title: { contains: q, mode: "insensitive" }
                  }
                : undefined
            },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
              listing: {
                select: {
                  id: true,
                  title: true
                }
              }
            }
          })
        : Promise.resolve([])
    ]);

    const pageMatches = PAGE_SUGGESTIONS.filter((page) => {
      if (!q) {
        return true;
      }
      return (
        page.label.toLowerCase().includes(q) ||
        page.keywords.some((keyword) => keyword.includes(q))
      );
    }).map<SuggestionItem>((page) => ({
      id: page.id,
      type: "page",
      label: page.label,
      href: page.href
    }));

    const categorySuggestions = categoryRows.map<SuggestionItem>((category) => ({
      id: category.id,
      type: "category",
      label: category.name,
      href: `/search?category=${encodeURIComponent(category.slug)}`,
      meta: category.depth > 0 ? "Subcategory" : "Category"
    }));

    const listingSuggestions = listingRows.map<SuggestionItem>((listing) => ({
      id: listing.id,
      type: "listing",
      label: listing.title,
      href: `/listing/${listing.id}`,
      meta: `${listing.currency} ${listing.price}`
    }));

    const chatSuggestions = chatRows.reduce<SuggestionItem[]>((acc, row) => {
      if (!row.listing) {
        return acc;
      }

      acc.push({
        id: row.id,
        type: "chat",
        label: row.listing.title,
        href: `/chat?listing=${row.listing.id}`,
        meta: "Recent chat"
      });
      return acc;
    }, []);

    const savedSuggestions = savedRows.reduce<SuggestionItem[]>((acc, row) => {
      if (!row.listing) {
        return acc;
      }

      acc.push({
        id: row.listing.id,
        type: "saved",
        label: row.listing.title,
        href: `/listing/${row.listing.id}`,
        meta: "Saved"
      });
      return acc;
    }, []);

    const merged = [
      ...pageMatches,
      ...categorySuggestions,
      ...listingSuggestions,
      ...chatSuggestions,
      ...savedSuggestions
    ];

    const deduped = merged.filter((item, index, list) => {
      return list.findIndex((entry) => entry.href === item.href) === index;
    });

    return {
      query,
      items: deduped.slice(0, take)
    };
  }

  private async extractUserId(request: Request) {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return null;
    }
    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      return null;
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ sub?: string }>(token, {
        secret: this.configService.get<string>("JWT_ACCESS_SECRET")
      });
      return payload.sub ?? null;
    } catch {
      return null;
    }
  }
}
