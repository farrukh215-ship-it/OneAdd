import { Injectable } from "@nestjs/common";
import { ListingStatus } from "@prisma/client";
import { FeatureFlagService } from "../feature-flags/feature-flag.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlags: FeatureFlagService
  ) {}

  async getFeed(userId: string, limit = 20) {
    const enabled = await this.featureFlags.isEnabled("RECOMMENDATIONS_FEED");
    const take = Math.min(Math.max(limit, 1), 100);

    const recent = await this.prisma.recentlyViewedListing.findMany({
      where: { userId },
      orderBy: { viewedAt: "desc" },
      take: 20,
      select: {
        listing: {
          select: { categoryId: true }
        }
      }
    });

    const categoryWeights = recent.reduce<Record<string, number>>((acc, row) => {
      const categoryId = row.listing?.categoryId;
      if (!categoryId) {
        return acc;
      }
      acc[categoryId] = (acc[categoryId] ?? 0) + 1;
      return acc;
    }, {});

    const preferredCategoryIds = Object.entries(categoryWeights)
      .sort((a, b) => b[1] - a[1])
      .map(([categoryId]) => categoryId)
      .slice(0, 5);

    const listings = await this.prisma.listing.findMany({
      where: {
        status: ListingStatus.ACTIVE,
        userId: { not: userId },
        ...(preferredCategoryIds.length > 0
          ? { categoryId: { in: preferredCategoryIds } }
          : {})
      },
      include: {
        media: true,
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            trustScore: { select: { score: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take
    });

    return {
      enabled,
      items: listings
    };
  }
}
