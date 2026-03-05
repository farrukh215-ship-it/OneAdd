import {
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { ListingStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 200;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async saveListing(userId: string, listingId: string) {
    await this.assertListingExists(listingId);
    await this.prisma.savedListing.upsert({
      where: {
        userId_listingId: { userId, listingId }
      },
      create: {
        userId,
        listingId
      },
      update: {}
    });

    return { saved: true };
  }

  async unsaveListing(userId: string, listingId: string) {
    await this.prisma.savedListing.deleteMany({
      where: {
        userId,
        listingId
      }
    });
    return { saved: false };
  }

  async getSavedListings(userId: string, limit?: number) {
    const take = this.safeLimit(limit);
    const rows = await this.prisma.savedListing.findMany({
      where: {
        userId,
        listing: {
          status: ListingStatus.ACTIVE
        }
      },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        listing: {
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
        }
      }
    });

    const items = rows
      .map((row) => row.listing)
      .filter((listing): listing is NonNullable<typeof listing> => Boolean(listing));

    return { items, total: items.length };
  }

  async markRecentlyViewed(userId: string, listingId: string) {
    await this.assertListingExists(listingId);
    const viewedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.recentlyViewedListing.upsert({
        where: {
          userId_listingId: { userId, listingId }
        },
        create: {
          userId,
          listingId,
          viewedAt
        },
        update: { viewedAt }
      });

      await tx.listingViewEvent.create({
        data: {
          userId,
          listingId,
          viewedAt
        }
      });
    });

    return { tracked: true, viewedAt: viewedAt.toISOString() };
  }

  async getRecentlyViewedListings(userId: string, limit?: number) {
    const take = this.safeLimit(limit);
    const rows = await this.prisma.recentlyViewedListing.findMany({
      where: {
        userId,
        listing: {
          status: ListingStatus.ACTIVE
        }
      },
      orderBy: { viewedAt: "desc" },
      take,
      include: {
        listing: {
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
        }
      }
    });

    const items = rows
      .map((row) => row.listing)
      .filter((listing): listing is NonNullable<typeof listing> => Boolean(listing));

    return { items, total: items.length };
  }

  private async assertListingExists(listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true }
    });
    if (!listing) {
      throw new NotFoundException("Listing not found.");
    }
  }

  private safeLimit(limit?: number) {
    if (!limit || Number.isNaN(limit)) {
      return DEFAULT_LIMIT;
    }
    return Math.min(Math.max(limit, 1), MAX_LIMIT);
  }
}
