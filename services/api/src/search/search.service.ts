import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { ListingStatus, Prisma } from "@prisma/client";
import { Request } from "express";
import {
  buildCategorySearchText,
  buildQueryTerms,
  detectQueryCategorySignals,
  minimumSemanticScore,
  normalizeSearchText,
  scoreSearchDocument
} from "./search-intelligence";
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
    const q = query.trim();
    const queryTerms = buildQueryTerms(q);
    const categorySignals = q
      ? detectQueryCategorySignals(q, queryTerms)
      : { matchedSlugs: [] as string[], semanticTerms: [] as string[] };
    const searchTerms = buildQueryTerms(q, categorySignals.semanticTerms);
    const normalizedQuery = normalizeSearchText(q);
    const userId = await this.extractUserId(request);
    const matchedCategoryRows =
      categorySignals.matchedSlugs.length > 0
        ? await this.prisma.category.findMany({
            where: {
              slug: {
                in: categorySignals.matchedSlugs
              }
            },
            select: { id: true }
          })
        : [];

    const [categoryRows, listingRows, chatRows, savedRows] = await Promise.all([
      this.prisma.category.findMany({
        where: normalizedQuery
          ? {
              OR: [
                ...searchTerms.flatMap<Prisma.CategoryWhereInput>((term) => [
                  { name: { contains: term, mode: "insensitive" } },
                  { slug: { contains: term, mode: "insensitive" } }
                ]),
                ...(categorySignals.matchedSlugs.length > 0
                  ? [{ slug: { in: categorySignals.matchedSlugs } }]
                  : [])
              ]
            }
          : undefined,
        orderBy: [{ depth: "asc" }, { name: "asc" }],
        take: 24,
        select: {
          id: true,
          name: true,
          slug: true,
          depth: true,
          parent: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      }),
      this.prisma.listing.findMany({
        where: {
          status: ListingStatus.ACTIVE,
          ...(normalizedQuery
            ? {
                OR: [
                  ...searchTerms.flatMap<Prisma.ListingWhereInput>((term) => [
                    { title: { contains: term, mode: "insensitive" } },
                    { description: { contains: term, mode: "insensitive" } },
                    { user: { city: { contains: term, mode: "insensitive" } } },
                    {
                      category: {
                        OR: [
                          { name: { contains: term, mode: "insensitive" } },
                          { slug: { contains: term, mode: "insensitive" } },
                          {
                            parent: {
                              is: {
                                name: { contains: term, mode: "insensitive" }
                              }
                            }
                          },
                          {
                            parent: {
                              is: {
                                slug: { contains: term, mode: "insensitive" }
                              }
                            }
                          }
                        ]
                      }
                    }
                  ]),
                  ...(matchedCategoryRows.length > 0
                    ? [{ categoryId: { in: matchedCategoryRows.map((item) => item.id) } }]
                    : [])
                ]
              }
            : {})
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          currency: true,
          price: true,
          description: true,
          createdAt: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              parent: {
                select: {
                  id: true,
                  name: true,
                  slug: true
                }
              }
            }
          },
          user: {
            select: {
              city: true
            }
          }
        },
        take: 48
      }),
      userId
        ? this.prisma.chatThread.findMany({
            where: {
              OR: [{ buyerId: userId }, { sellerId: userId }],
              listing: normalizedQuery
                ? {
                    OR: searchTerms.map((term) => ({
                      title: { contains: term, mode: "insensitive" }
                    }))
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
              listing: normalizedQuery
                ? {
                    OR: searchTerms.map((term) => ({
                      title: { contains: term, mode: "insensitive" }
                    }))
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
      if (!normalizedQuery) {
        return true;
      }
      const haystack = `${page.label} ${page.keywords.join(" ")}`;
      return scoreSearchDocument({
        query: normalizedQuery,
        terms: searchTerms,
        title: page.label,
        text: haystack
      }) > 0;
    }).map<SuggestionItem>((page) => ({
      id: page.id,
      type: "page",
      label: page.label,
      href: page.href
    }));

    const categorySuggestions = categoryRows
      .map((category) => {
        const categoryPath = buildCategorySearchText(category);
        const score = scoreSearchDocument({
          query: normalizedQuery,
          terms: searchTerms,
          title: category.name,
          text: `${category.name} ${category.slug} ${categoryPath}`,
          categoryPath
        });

        return {
          score,
          item: {
            id: category.id,
            type: "category" as const,
            label: category.name,
            href: `/search?category=${encodeURIComponent(category.slug)}`,
            meta: category.depth > 0 ? "Subcategory" : "Main Category"
          }
        };
      })
      .filter(({ score }) => score >= (normalizedQuery ? 0.6 : 0))
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item);

    const listingThreshold = minimumSemanticScore(searchTerms) * 0.6;
    const listingSuggestions = listingRows
      .map((listing) => {
        const categoryPath = buildCategorySearchText(listing.category);
        const city = this.extractMetadataValue(listing.description ?? "", "city") || listing.user?.city || "";
        const score = scoreSearchDocument({
          query: normalizedQuery,
          terms: searchTerms,
          title: listing.title,
          text: `${listing.title} ${listing.description ?? ""} ${city} ${categoryPath}`,
          categoryPath
        });

        const metaParts = [
          city.trim(),
          `${listing.currency} ${listing.price}`
        ].filter(Boolean);

        return {
          score,
          item: {
            id: listing.id,
            type: "listing" as const,
            label: listing.title,
            href: `/listing/${listing.id}`,
            meta: metaParts.join(" • ")
          }
        };
      })
      .filter(({ score }) => score >= (normalizedQuery ? listingThreshold : 0))
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item);

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
      ...categorySuggestions,
      ...listingSuggestions,
      ...pageMatches,
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

  private extractMetadataValue(description: string, key: "city" | "location") {
    const match = description.match(new RegExp(`\\b${key}\\s*:\\s*([^\\n]+)`, "i"));
    return match?.[1]?.trim() ?? "";
  }
}
