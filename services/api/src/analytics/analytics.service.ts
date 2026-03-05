import { Injectable } from "@nestjs/common";
import { ChatMessageType, ListingStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSellerOverview(userId: string) {
    const [totalAds, activeAds, totalViews, chatStarts, offersCount] =
      await Promise.all([
        this.prisma.listing.count({
          where: { userId }
        }),
        this.prisma.listing.count({
          where: { userId, status: ListingStatus.ACTIVE }
        }),
        this.prisma.listingViewEvent.count({
          where: {
            listing: { userId }
          }
        }),
        this.prisma.chatThread.count({
          where: {
            listing: { userId }
          }
        }),
        this.prisma.chatMessage.count({
          where: {
            type: ChatMessageType.TEXT,
            thread: {
              listing: { userId }
            },
            OR: [
              { content: { contains: "offer", mode: "insensitive" } },
              { content: { contains: "bid", mode: "insensitive" } },
              { content: { contains: "pkr", mode: "insensitive" } },
              { content: { contains: "rs", mode: "insensitive" } }
            ]
          }
        })
      ]);

    return {
      totalAds,
      activeAds,
      totalViews,
      chatStarts,
      offersCount
    };
  }

  async getCategoryForecast() {
    const now = new Date();
    const startCurrent = new Date(now);
    startCurrent.setDate(now.getDate() - 30);
    const startPrevious = new Date(now);
    startPrevious.setDate(now.getDate() - 60);

    const [currentCount, previousCount, byCategory] = await Promise.all([
      this.prisma.listing.count({
        where: { createdAt: { gte: startCurrent } }
      }),
      this.prisma.listing.count({
        where: {
          createdAt: {
            gte: startPrevious,
            lt: startCurrent
          }
        }
      }),
      this.prisma.listing.groupBy({
        by: ["categoryId"],
        where: {
          status: ListingStatus.ACTIVE
        },
        _count: { _all: true }
      })
    ]);

    const topGroups = [...byCategory]
      .sort((a, b) => b._count._all - a._count._all)
      .slice(0, 12);

    const categoryIds = topGroups.map((entry) => entry.categoryId);
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, slug: true }
    });
    const categoryById = new Map(categories.map((entry) => [entry.id, entry]));

    const heatmap = topGroups.map((entry) => {
      const category = categoryById.get(entry.categoryId);
      return {
        categoryId: entry.categoryId,
        categoryName: category?.name ?? "Unknown",
        categorySlug: category?.slug ?? "",
        activeListings: entry._count._all
      };
    });

    const growthRate =
      previousCount > 0 ? Number((((currentCount - previousCount) / previousCount) * 100).toFixed(2)) : 0;

    return {
      windowDays: 30,
      currentCount,
      previousCount,
      growthRate,
      heatmap
    };
  }
}
