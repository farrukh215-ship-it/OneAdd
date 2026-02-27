import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException
} from "@nestjs/common";
import { ListingMediaType, ListingStatus, Prisma } from "@prisma/client";
import { ListingsService } from "./listings.service";

describe("ListingsService", () => {
  const trustScoreServiceMock = {
    recalculateForUser: jest.fn()
  } as any;
  const notificationsServiceMock = {
    notifyUsers: jest.fn()
  } as any;

  const baseListing = {
    id: "listing-1",
    userId: "user-1",
    categoryId: "cat-1",
    status: ListingStatus.DRAFT
  };

  it("enforces max 6 images", async () => {
    const prisma: any = { listing: { create: jest.fn() } };
    const service = new ListingsService(
      prisma,
      trustScoreServiceMock,
      notificationsServiceMock
    );

    await expect(
      service.createListing("user-1", {
        categoryId: "cat-1",
        title: "Listing",
        description: "Desc",
        price: 10,
        showPhone: true,
        allowChat: true,
        allowCall: true,
        allowSMS: true,
        media: new Array(7).fill(null).map((_, index) => ({
          type: ListingMediaType.IMAGE,
          url: `https://x.com/${index}.jpg`
        }))
      })
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it("enforces max video duration 30s", async () => {
    const prisma: any = { listing: { create: jest.fn() } };
    const service = new ListingsService(
      prisma,
      trustScoreServiceMock,
      notificationsServiceMock
    );

    await expect(
      service.createListing("user-1", {
        categoryId: "cat-1",
        title: "Listing",
        description: "Desc",
        price: 10,
        showPhone: true,
        allowChat: true,
        allowCall: true,
        allowSMS: true,
        media: [
          {
            type: ListingMediaType.VIDEO,
            url: "https://x.com/v.mp4",
            durationSec: 31
          }
        ]
      })
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it("returns 409 when lock already exists", async () => {
    const tx = {
      listing: { findUnique: jest.fn().mockResolvedValue(baseListing) },
      userCategoryActiveListing: {
        findUnique: jest.fn().mockResolvedValue({ id: "lock-1" }),
        create: jest.fn()
      },
      user: { findUnique: jest.fn() },
      listingUpdate: jest.fn()
    };

    const prisma: any = {
      $transaction: jest.fn((fn: (txArg: any) => unknown) =>
        fn({
          ...tx,
          listing: {
            ...tx.listing,
            update: jest.fn()
          }
        })
      )
    };

    const service = new ListingsService(
      prisma,
      trustScoreServiceMock,
      notificationsServiceMock
    );

    await expect(service.activateListing("user-1", "listing-1")).rejects.toBeInstanceOf(
      ConflictException
    );
  });

  it("handles race condition with unique constraint conflict", async () => {
    const tx = {
      listing: { findUnique: jest.fn().mockResolvedValue(baseListing), update: jest.fn() },
      userCategoryActiveListing: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockRejectedValue({ code: "P2002" })
      },
      user: { findUnique: jest.fn().mockResolvedValue({ shadowBanned: false }) }
    };
    const prisma: any = {
      $transaction: jest.fn((fn: (txArg: any) => unknown) => fn(tx))
    };

    const service = new ListingsService(
      prisma,
      trustScoreServiceMock,
      notificationsServiceMock
    );

    await expect(service.activateListing("user-1", "listing-1")).rejects.toBeInstanceOf(
      ConflictException
    );
  });

  it("sets rankingScore=0 when user is shadow banned", async () => {
    const updateMock = jest.fn().mockResolvedValue({ id: "listing-1" });
    const tx = {
      listing: {
        findUnique: jest.fn().mockResolvedValue(baseListing),
        update: updateMock
      },
      userCategoryActiveListing: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: "lock-1" })
      },
      user: { findUnique: jest.fn().mockResolvedValue({ shadowBanned: true }) }
    };
    const prisma: any = {
      $transaction: jest.fn((fn: (txArg: any) => unknown) => fn(tx))
    };

    const service = new ListingsService(
      prisma,
      trustScoreServiceMock,
      notificationsServiceMock
    );
    await service.activateListing("user-1", "listing-1");

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          rankingScore: new Prisma.Decimal(0)
        })
      })
    );
  });

  it("throws not found for missing listing", async () => {
    const prisma: any = {
      $transaction: jest.fn((fn: (txArg: any) => unknown) =>
        fn({
          listing: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn() },
          userCategoryActiveListing: { findUnique: jest.fn(), create: jest.fn() },
          user: { findUnique: jest.fn() }
        })
      )
    };
    const service = new ListingsService(
      prisma,
      trustScoreServiceMock,
      notificationsServiceMock
    );
    await expect(service.activateListing("user-1", "missing")).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it("expires active listings and releases locks/chats", async () => {
    const now = new Date();
    const prisma: any = {
      listing: {
        findMany: jest.fn().mockResolvedValue([{ id: "listing-1" }])
      },
      chatThread: {
        findMany: jest.fn().mockResolvedValue([{ buyerId: "buyer-1" }])
      },
      $transaction: jest.fn(async (fn: (txArg: any) => unknown) =>
        fn({
          listing: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
          userCategoryActiveListing: {
            deleteMany: jest.fn().mockResolvedValue({ count: 1 })
          },
          chatThread: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) }
        })
      )
    };

    const service = new ListingsService(
      prisma,
      trustScoreServiceMock,
      notificationsServiceMock
    );

    const result = await service.expireListingsDaily();
    expect(result).toEqual({ expiredCount: 1 });
    expect(notificationsServiceMock.notifyUsers).toHaveBeenCalledWith(
      ["buyer-1"],
      "LISTING_DEACTIVATED",
      "Listing deactivated",
      "A listing you were chatting on has been deactivated.",
      { reason: "expired", listingIds: ["listing-1"] }
    );
    expect(prisma.listing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          expiresAt: expect.objectContaining({ lte: expect.any(Date) })
        })
      })
    );
    expect(now).toBeDefined();
  });
});
