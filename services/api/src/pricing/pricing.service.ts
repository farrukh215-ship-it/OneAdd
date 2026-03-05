import { Injectable } from "@nestjs/common";
import { ListingStatus, Prisma } from "@prisma/client";
import { FeatureFlagService } from "../feature-flags/feature-flag.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlags: FeatureFlagService
  ) {}

  async suggest(categoryRef?: string, city?: string, condition?: string) {
    const enabled = await this.featureFlags.isEnabled("PRICE_INTELLIGENCE");
    const normalizedCategory = categoryRef?.trim();
    const normalizedCity = city?.trim();
    const normalizedCondition = condition?.trim().toUpperCase();

    let categoryId: string | undefined;
    if (normalizedCategory) {
      const category = await this.prisma.category.findFirst({
        where: {
          OR: [{ id: normalizedCategory }, { slug: normalizedCategory }]
        },
        select: { id: true }
      });
      categoryId = category?.id;
    }

    const where: Prisma.ListingWhereInput = {
      status: {
        in: [
          ListingStatus.ACTIVE,
          ListingStatus.SOLD,
          ListingStatus.PAUSED,
          ListingStatus.EXPIRED
        ]
      },
      ...(categoryId ? { categoryId } : {}),
      ...(normalizedCity
        ? {
            OR: [
              { title: { contains: normalizedCity, mode: "insensitive" } },
              { description: { contains: normalizedCity, mode: "insensitive" } }
            ]
          }
        : {}),
      ...(normalizedCondition
        ? {
            description: {
              contains: `Condition: ${normalizedCondition}`,
              mode: "insensitive"
            }
          }
        : {})
    };

    const rows = await this.prisma.listing.findMany({
      where,
      select: {
        price: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" },
      take: 400
    });

    const prices = rows
      .map((row) => Number(row.price))
      .filter((price) => Number.isFinite(price) && price > 0)
      .sort((a, b) => a - b);

    if (prices.length === 0) {
      return {
        enabled,
        range: { min: 0, max: 0, suggested: 0 },
        confidence: "low",
        trend: "insufficient_data"
      };
    }

    const p25 = prices[Math.floor((prices.length - 1) * 0.25)] ?? prices[0];
    const p50 = prices[Math.floor((prices.length - 1) * 0.5)] ?? prices[0];
    const p75 = prices[Math.floor((prices.length - 1) * 0.75)] ?? prices[prices.length - 1];

    const now = Date.now();
    const fourteenDays = 14 * 24 * 60 * 60 * 1000;
    const latest = rows
      .filter((row) => now - row.createdAt.getTime() <= fourteenDays)
      .map((row) => Number(row.price))
      .filter((price) => Number.isFinite(price) && price > 0);
    const previous = rows
      .filter((row) => {
        const age = now - row.createdAt.getTime();
        return age > fourteenDays && age <= fourteenDays * 2;
      })
      .map((row) => Number(row.price))
      .filter((price) => Number.isFinite(price) && price > 0);

    const avgLatest =
      latest.length > 0 ? latest.reduce((sum, entry) => sum + entry, 0) / latest.length : 0;
    const avgPrevious =
      previous.length > 0
        ? previous.reduce((sum, entry) => sum + entry, 0) / previous.length
        : avgLatest;

    let trend: "up" | "down" | "stable" | "insufficient_data" = "insufficient_data";
    if (avgLatest > 0 && avgPrevious > 0) {
      const delta = (avgLatest - avgPrevious) / avgPrevious;
      if (Math.abs(delta) < 0.04) trend = "stable";
      else trend = delta > 0 ? "up" : "down";
    }

    return {
      enabled,
      range: {
        min: Math.round(p25),
        max: Math.round(p75),
        suggested: Math.round(p50)
      },
      confidence: prices.length >= 80 ? "high" : prices.length >= 25 ? "medium" : "low",
      trend
    };
  }
}
