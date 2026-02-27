import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException
} from "@nestjs/common";
import {
  ChatThreadStatus,
  ListingMediaType,
  ListingStatus,
  Prisma
} from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { TrustScoreService } from "../trust-score/trust-score.service";
import { CreateListingDto } from "./dto/create-listing.dto";

@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trustScoreService: TrustScoreService,
    private readonly notificationsService: NotificationsService
  ) {}

  async createListing(userId: string, dto: CreateListingDto) {
    this.validateMediaConstraints(dto.media);

    return this.prisma.listing.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        title: dto.title.trim(),
        description: dto.description.trim(),
        price: new Prisma.Decimal(dto.price),
        currency: dto.currency?.trim().toUpperCase() ?? "PKR",
        showPhone: dto.showPhone,
        allowChat: dto.allowChat,
        allowCall: dto.allowCall,
        allowSMS: dto.allowSMS,
        media: {
          create: dto.media.map((item, index) => ({
            type: item.type,
            url: item.url,
            durationSec: item.durationSec ?? null,
            sortOrder: index
          }))
        }
      },
      include: { media: true }
    });
  }

  async activateListing(userId: string, listingId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const listing = await tx.listing.findUnique({
          where: { id: listingId },
          select: {
            id: true,
            userId: true,
            categoryId: true,
            status: true
          }
        });

        if (!listing) {
          throw new NotFoundException("Listing not found.");
        }
        if (listing.userId !== userId) {
          throw new ForbiddenException("You can only activate your own listing.");
        }
        if (
          listing.status === ListingStatus.SOLD ||
          listing.status === ListingStatus.REMOVED
        ) {
          throw new BadRequestException("This listing cannot be activated.");
        }

        const lock = await tx.userCategoryActiveListing.findUnique({
          where: {
            userId_categoryId: {
              userId,
              categoryId: listing.categoryId
            }
          }
        });

        if (lock) {
          throw new ConflictException(
            "An active listing already exists for this category."
          );
        }

        await tx.userCategoryActiveListing.create({
          data: {
            userId,
            categoryId: listing.categoryId,
            listingId: listing.id
          }
        });

        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { shadowBanned: true }
        });

        const expiresAt = this.nextExpiryDate();
        return tx.listing.update({
          where: { id: listing.id },
          data: {
            status: ListingStatus.ACTIVE,
            publishedAt: new Date(),
            expiresAt,
            rankingScore: user?.shadowBanned
              ? new Prisma.Decimal(0)
              : new Prisma.Decimal(1)
          }
        });
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          "An active listing already exists for this category."
        );
      }
      throw error;
    }
  }

  async expireListingsDaily() {
    const now = new Date();
    const expiredListings = await this.prisma.listing.findMany({
      where: {
        status: ListingStatus.ACTIVE,
        expiresAt: { lte: now }
      },
      select: { id: true }
    });

    if (expiredListings.length === 0) {
      return { expiredCount: 0 };
    }

    const listingIds = expiredListings.map((item) => item.id);
    const affectedBuyers = await this.prisma.chatThread.findMany({
      where: {
        listingId: { in: listingIds },
        status: ChatThreadStatus.OPEN
      },
      select: { buyerId: true }
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.listing.updateMany({
        where: { id: { in: listingIds } },
        data: {
          status: ListingStatus.EXPIRED,
          rankingScore: new Prisma.Decimal(0)
        }
      });

      await tx.userCategoryActiveListing.deleteMany({
        where: { listingId: { in: listingIds } }
      });

      await tx.chatThread.updateMany({
        where: {
          listingId: { in: listingIds },
          status: ChatThreadStatus.OPEN
        },
        data: {
          status: ChatThreadStatus.CLOSED,
          closedAt: now
        }
      });
    });

    await this.notificationsService.notifyUsers(
      affectedBuyers.map((item) => item.buyerId),
      "LISTING_DEACTIVATED",
      "Listing deactivated",
      "A listing you were chatting on has been deactivated.",
      { reason: "expired", listingIds }
    );

    return { expiredCount: listingIds.length };
  }

  async markListingSold(userId: string, listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        userId: true,
        status: true
      }
    });

    if (!listing) {
      throw new NotFoundException("Listing not found.");
    }
    if (listing.userId !== userId) {
      throw new ForbiddenException("You can only mark your own listing as sold.");
    }
    if (listing.status !== ListingStatus.ACTIVE) {
      throw new BadRequestException("Only active listings can be marked as sold.");
    }

    const participants = await this.prisma.chatThread.findMany({
      where: { listingId },
      select: { buyerId: true }
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      const soldListing = await tx.listing.update({
        where: { id: listingId },
        data: {
          status: ListingStatus.SOLD,
          rankingScore: new Prisma.Decimal(0)
        }
      });

      await tx.userCategoryActiveListing.deleteMany({
        where: { listingId }
      });

      await tx.chatThread.updateMany({
        where: {
          listingId,
          status: ChatThreadStatus.OPEN
        },
        data: {
          status: ChatThreadStatus.CLOSED,
          closedAt: new Date()
        }
      });

      return soldListing;
    });

    await this.trustScoreService.recalculateForUser(userId);
    await this.notificationsService.notifyUsers(
      participants.map((item) => item.buyerId).filter((id) => id !== userId),
      "LISTING_SOLD",
      "Listing sold",
      "A listing you were chatting on has been sold.",
      { listingId }
    );
    return updated;
  }

  async deactivateListing(userId: string, listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        userId: true,
        status: true
      }
    });

    if (!listing) {
      throw new NotFoundException("Listing not found.");
    }
    if (listing.userId !== userId) {
      throw new ForbiddenException("You can only deactivate your own listing.");
    }
    if (listing.status !== ListingStatus.ACTIVE) {
      throw new BadRequestException("Only active listings can be deactivated.");
    }

    const participants = await this.prisma.chatThread.findMany({
      where: { listingId },
      select: { buyerId: true }
    });

    const deactivated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.listing.update({
        where: { id: listingId },
        data: {
          status: ListingStatus.PAUSED,
          rankingScore: new Prisma.Decimal(0)
        }
      });

      await tx.userCategoryActiveListing.deleteMany({
        where: { listingId }
      });

      await tx.chatThread.updateMany({
        where: {
          listingId,
          status: ChatThreadStatus.OPEN
        },
        data: {
          status: ChatThreadStatus.CLOSED,
          closedAt: new Date()
        }
      });

      return updated;
    });

    await this.notificationsService.notifyUsers(
      participants.map((item) => item.buyerId).filter((id) => id !== userId),
      "LISTING_DEACTIVATED",
      "Listing deactivated",
      "A listing you were chatting on has been deactivated.",
      { listingId }
    );

    return deactivated;
  }

  async getFeed(limit = 20) {
    const listings = await this.prisma.listing.findMany({
      where: { status: ListingStatus.ACTIVE },
      include: {
        media: true,
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            trustScore: {
              select: { score: true }
            }
          }
        }
      },
      take: Math.min(Math.max(limit, 1), 100)
    });

    return this.sortByTrustWeightedRanking(listings);
  }

  async search(query: string, limit = 20) {
    const q = query.trim();
    if (!q) {
      return [];
    }

    const listings = await this.prisma.listing.findMany({
      where: {
        status: ListingStatus.ACTIVE,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } }
        ]
      },
      include: {
        media: true,
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            trustScore: {
              select: { score: true }
            }
          }
        }
      },
      take: Math.min(Math.max(limit, 1), 100)
    });

    return this.sortByTrustWeightedRanking(listings);
  }

  async getListingById(listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
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
      }
    });

    if (!listing) {
      throw new NotFoundException("Listing not found.");
    }

    return listing;
  }

  async getMyListings(userId: string) {
    return this.prisma.listing.findMany({
      where: { userId },
      include: { media: true },
      orderBy: { createdAt: "desc" }
    });
  }

  private validateMediaConstraints(
    media: Array<{ type: ListingMediaType; durationSec?: number }>
  ) {
    const images = media.filter((item) => item.type === ListingMediaType.IMAGE);
    const videos = media.filter((item) => item.type === ListingMediaType.VIDEO);

    if (images.length > 6) {
      throw new UnprocessableEntityException("Maximum 6 images are allowed.");
    }
    if (videos.length > 1) {
      throw new UnprocessableEntityException("Only 1 video is allowed.");
    }
    if (videos[0]?.durationSec && videos[0].durationSec > 30) {
      throw new UnprocessableEntityException(
        "Video duration must be 30 seconds or less."
      );
    }
  }

  private isUniqueConstraintError(error: unknown) {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    );
  }

  private nextExpiryDate() {
    const now = new Date();
    const next = new Date(now);
    next.setDate(now.getDate() + 30);
    return next;
  }

  private sortByTrustWeightedRanking<T extends { rankingScore: Prisma.Decimal; user: { trustScore: { score: number } | null } }>(
    listings: T[]
  ) {
    return [...listings].sort((a, b) => {
      const aRank = Number(a.rankingScore ?? 0);
      const bRank = Number(b.rankingScore ?? 0);
      const aTrust = a.user.trustScore?.score ?? 0;
      const bTrust = b.user.trustScore?.score ?? 0;

      const aScore = aRank * (1 + aTrust / 100);
      const bScore = bRank * (1 + bTrust / 100);
      return bScore - aScore;
    });
  }
}
