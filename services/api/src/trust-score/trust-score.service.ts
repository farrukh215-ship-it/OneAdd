import { Injectable } from "@nestjs/common";
import { ListingStatus, ReportStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TrustScoreService {
  constructor(private readonly prisma: PrismaService) {}

  async getTrustScore(userId: string) {
    return this.prisma.trustScore.findUnique({
      where: { userId },
      select: { userId: true, score: true, breakdown: true, updatedAt: true }
    });
  }

  async recalculateForUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, createdAt: true }
    });

    if (!user) {
      return null;
    }

    const [sellerThreadCount, respondedThreadCount, totalRelevantListings, soldCount, reportCount] =
      await Promise.all([
        this.prisma.chatThread.count({ where: { sellerId: userId } }),
        this.prisma.chatThread.count({
          where: {
            sellerId: userId,
            messages: { some: { senderId: userId } }
          }
        }),
        this.prisma.listing.count({
          where: {
            userId,
            status: { in: [ListingStatus.ACTIVE, ListingStatus.SOLD, ListingStatus.EXPIRED] }
          }
        }),
        this.prisma.listing.count({
          where: { userId, status: ListingStatus.SOLD }
        }),
        this.prisma.report.count({
          where: {
            targetUserId: userId,
            status: { in: [ReportStatus.OPEN, ReportStatus.IN_REVIEW, ReportStatus.RESOLVED] }
          }
        })
      ]);

    const responseRate = sellerThreadCount === 0 ? 1 : respondedThreadCount / sellerThreadCount;
    const soldRatio =
      totalRelevantListings === 0 ? 0 : soldCount / totalRelevantListings;
    const accountAgeDays = Math.max(
      0,
      Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    );
    const accountAgeScore = Math.min(1, accountAgeDays / 365);
    const reportsPenalty = Math.min(1, reportCount / 8);

    const score = Math.round(
      responseRate * 30 + soldRatio * 40 + accountAgeScore * 20 + (1 - reportsPenalty) * 10
    );

    const breakdown = {
      responseRate,
      soldRatio,
      reportsPenalty,
      accountAgeDays,
      componentScores: {
        responseRate: Math.round(responseRate * 30),
        soldRatio: Math.round(soldRatio * 40),
        accountAge: Math.round(accountAgeScore * 20),
        reports: Math.round((1 - reportsPenalty) * 10)
      }
    };

    return this.prisma.trustScore.upsert({
      where: { userId },
      update: {
        score,
        breakdown,
        computedAt: new Date()
      },
      create: {
        userId,
        score,
        breakdown
      }
    });
  }

  async recalculateAllUsers() {
    const users = await this.prisma.user.findMany({
      select: { id: true }
    });

    for (const user of users) {
      await this.recalculateForUser(user.id);
    }

    return { recalculated: users.length };
  }
}
