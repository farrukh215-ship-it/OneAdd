import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException
} from "@nestjs/common";
import { marketplaceCategoryCatalog } from "@aikad/shared";
import {
  ChatMessageType,
  ChatThreadStatus,
  ListingMediaType,
  ListingStatus,
  Prisma
} from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { TrustScoreService } from "../trust-score/trust-score.service";
import { AuthService } from "../auth/auth.service";
import { CreateListingDto } from "./dto/create-listing.dto";

type ListingSearchSortBy =
  | "relevance"
  | "price_asc"
  | "price_desc"
  | "date_desc"
  | "date_asc";

const SEARCH_SYNONYM_MAP: Record<string, string[]> = {
  bicycle: ["cycle", "bike", "bikes", "cycles"],
  bicycles: ["bicycle", "cycle", "bike", "bikes", "cycles"],
  cycle: ["bicycle", "bicycles", "bike", "bikes", "cycles"],
  cycles: ["cycle", "bicycle", "bikes"],
  bike: ["bicycle", "cycle", "motorcycle", "bikes"],
  bikes: ["bike", "bicycle", "motorcycle", "cycles"],
  motorcycle: ["bike", "bikes", "motorbike"],
  motorcycles: ["motorcycle", "bike", "bikes"],
  mobile: ["mobiles", "phone", "phones", "smartphone", "smartphones", "cellphone"],
  mobiles: ["mobile", "phone", "phones", "smartphone", "smartphones"],
  phone: ["mobile", "mobiles", "smartphone", "cellphone"],
  phones: ["phone", "mobile", "mobiles", "smartphones"],
  smartphone: ["mobile", "phone", "android", "iphone"],
  smartphones: ["smartphone", "mobile", "phones"],
  car: ["cars", "vehicle", "vehicles", "auto", "automobile"],
  cars: ["car", "vehicle", "vehicles", "auto"],
  vehicle: ["vehicles", "car", "cars", "auto"],
  vehicles: ["vehicle", "cars", "car", "auto"],
  laptop: ["laptops", "computer", "computers", "notebook"],
  laptops: ["laptop", "computer", "computers"],
  sofa: ["couch", "settee", "sofas"],
  sofas: ["sofa", "couch", "settee"],
  tv: ["television", "televisions", "led", "lcd"],
  television: ["tv", "led", "lcd"],
  fridge: ["refrigerator", "freezer", "fridges"],
  fridges: ["fridge", "refrigerator", "freezer"]
};

@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trustScoreService: TrustScoreService,
    private readonly notificationsService: NotificationsService,
    private readonly authService: AuthService
  ) {}

  async createListing(userId: string, dto: CreateListingDto) {
    await this.assertPhoneVerified(userId);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ForbiddenException("User not found.");
    }
    if (dto.publishOtpVerificationToken) {
      await this.authService.validateListingPublishOtpToken(
        dto.publishOtpVerificationToken,
        user
      );
    }
    this.validateMediaConstraints(dto.media);
    this.assertListingContentQuality(dto.description, dto.city);
    const resolvedCategoryId = await this.resolveCategoryReference(dto.categoryId);
    const normalizedDescription = this.buildNormalizedDescription(
      dto.description,
      dto.city
    );

    return this.prisma.listing.create({
      data: {
        userId,
        categoryId: resolvedCategoryId,
        title: dto.title.trim(),
        description: normalizedDescription,
        price: new Prisma.Decimal(dto.price),
        currency: dto.currency?.trim().toUpperCase() ?? "PKR",
        showPhone: dto.showPhone,
        allowChat: dto.allowChat,
        allowCall: dto.allowCall,
        allowSMS: dto.allowSMS,
        isNegotiable: Boolean(dto.isNegotiable),
        media: {
          create: dto.media.map((item, index) => ({
            type: item.type,
            url: item.url,
            durationSec: item.durationSec ?? null,
            sortOrder: index
          }))
        }
      },
      include: {
        media: true,
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
        }
      }
    });
  }

  async updateListing(userId: string, listingId: string, dto: CreateListingDto) {
    await this.assertPhoneVerified(userId);
    this.validateMediaConstraints(dto.media);
    this.assertListingContentQuality(dto.description, dto.city);

    const [current, resolvedCategoryId] = await Promise.all([
      this.prisma.listing.findUnique({
        where: { id: listingId },
        select: {
          id: true,
          userId: true,
          categoryId: true,
          status: true
        }
      }),
      this.resolveCategoryReference(dto.categoryId)
    ]);

    if (!current) {
      throw new NotFoundException("Listing not found.");
    }
    if (current.userId !== userId) {
      throw new ForbiddenException("You can only edit your own listing.");
    }
    if (
      current.status === ListingStatus.SOLD ||
      current.status === ListingStatus.REMOVED
    ) {
      throw new BadRequestException("This listing cannot be edited.");
    }

    const normalizedDescription = this.buildNormalizedDescription(
      dto.description,
      dto.city
    );

    return this.prisma.$transaction(async (tx) => {
      if (
        current.status === ListingStatus.ACTIVE &&
        current.categoryId !== resolvedCategoryId
      ) {
        const lock = await tx.userCategoryActiveListing.findUnique({
          where: {
            userId_categoryId: {
              userId,
              categoryId: resolvedCategoryId
            }
          }
        });

        if (lock && lock.listingId !== listingId) {
          throw new ConflictException(
            "An active listing already exists for this category."
          );
        }

        await tx.userCategoryActiveListing.updateMany({
          where: { listingId },
          data: { categoryId: resolvedCategoryId }
        });
      }

      await tx.listingMedia.deleteMany({
        where: { listingId }
      });

      return tx.listing.update({
        where: { id: listingId },
        data: {
          categoryId: resolvedCategoryId,
          title: dto.title.trim(),
          description: normalizedDescription,
          price: new Prisma.Decimal(dto.price),
          currency: dto.currency?.trim().toUpperCase() ?? "PKR",
          showPhone: dto.showPhone,
          allowChat: dto.allowChat,
          allowCall: dto.allowCall,
          allowSMS: dto.allowSMS,
          isNegotiable: Boolean(dto.isNegotiable),
          media: {
            create: dto.media.map((item, index) => ({
              type: item.type,
              url: item.url,
              durationSec: item.durationSec ?? null,
              sortOrder: index
            }))
          }
        },
        include: {
          media: {
            orderBy: { sortOrder: "asc" }
          },
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
          }
        }
      });
    });
  }

  async relistListing(userId: string, listingId: string) {
    const source = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        media: {
          orderBy: { sortOrder: "asc" }
        }
      }
    });

    if (!source) {
      throw new NotFoundException("Listing not found.");
    }
    if (source.userId !== userId) {
      throw new ForbiddenException("You can only relist your own listing.");
    }
    const relistableStatus =
      source.status === ListingStatus.SOLD ||
      source.status === ListingStatus.EXPIRED ||
      source.status === ListingStatus.PAUSED;
    if (!relistableStatus) {
      throw new BadRequestException(
        "Only sold, expired or paused listings can be relisted."
      );
    }

    const hasLock = await this.prisma.userCategoryActiveListing.findUnique({
      where: {
        userId_categoryId: {
          userId,
          categoryId: source.categoryId
        }
      }
    });
    if (hasLock) {
      throw new ConflictException(
        "An active listing already exists for this category."
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { shadowBanned: true }
    });

    return this.prisma.$transaction(async (tx) => {
      const relisted = await tx.listing.create({
        data: {
          userId,
          categoryId: source.categoryId,
          title: source.title,
          description: source.description,
          price: source.price,
          currency: source.currency,
          showPhone: source.showPhone,
          allowChat: source.allowChat,
          allowCall: source.allowCall,
          allowSMS: source.allowSMS,
          isNegotiable: source.isNegotiable,
          status: ListingStatus.ACTIVE,
          publishedAt: new Date(),
          expiresAt: this.nextExpiryDate(),
          rankingScore: user?.shadowBanned
            ? new Prisma.Decimal(0)
            : new Prisma.Decimal(1),
          media: {
            create: source.media.map((item, index) => ({
              type: item.type,
              url: item.url,
              durationSec: item.durationSec,
              sortOrder: index
            }))
          }
        },
        include: {
          media: true,
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
          }
        }
      });

      await tx.userCategoryActiveListing.create({
        data: {
          userId,
          categoryId: relisted.categoryId,
          listingId: relisted.id
        }
      });

      return relisted;
    });
  }

  async activateListing(userId: string, listingId: string) {
    await this.assertPhoneVerified(userId);
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
        media: {
          orderBy: { sortOrder: "asc" }
        },
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
            id: true,
            fullName: true,
            phone: true,
            updatedAt: true,
            deviceFingerprints: {
              orderBy: { lastSeenAt: "desc" },
              take: 1,
              select: { lastSeenAt: true }
            },
            trustScore: {
              select: { score: true }
            }
          }
        }
      },
      take: Math.min(Math.max(limit, 1), 100)
    });

    const sorted = this.sortByTrustWeightedRanking(listings);
    return sorted.map((item) => this.normalizeListingForClient(item));
  }

  async getCategoryCatalog() {
    const [dbCategories, listingCounts] = await Promise.all([
      this.prisma.category.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          parentId: true
        }
      }),
      this.prisma.listing.groupBy({
        by: ["categoryId"],
        where: { status: ListingStatus.ACTIVE },
        _count: { _all: true }
      })
    ]);

    const bySlug = new Map(dbCategories.map((item) => [item.slug, item]));
    const countByCategoryId = new Map(
      listingCounts.map((item) => [item.categoryId, item._count._all])
    );

    return marketplaceCategoryCatalog.map((root) => {
      const rootRecord = bySlug.get(root.slug);
      const subcategories = root.subcategories.map((sub) => {
        const subRecord = bySlug.get(sub.slug);
        const subId = subRecord?.id ?? sub.slug;
        return {
          id: subId,
          slug: sub.slug,
          name: sub.name,
          parentSlug: root.slug,
          parentName: root.name,
          listingCount: countByCategoryId.get(subId) ?? 0
        };
      });

      const rootId = rootRecord?.id ?? root.slug;
      const rootDirectCount = countByCategoryId.get(rootId) ?? 0;
      const childCount = subcategories.reduce(
        (total, item) => total + item.listingCount,
        0
      );

      return {
        id: rootId,
        slug: root.slug,
        name: root.name,
        icon: root.icon,
        accent: root.accent,
        listingCount: rootDirectCount + childCount,
        subcategoryCount: subcategories.length,
        subcategories
      };
    });
  }

  async search(
    query: string,
    limit = 20,
    filters?: {
      category?: string;
      minPrice?: number;
      maxPrice?: number;
      city?: string;
      area?: string;
      isNegotiable?: boolean;
      sortBy?: string;
      semanticTerms?: string[];
    }
  ) {
    const q = query.trim();
    const rawQueryTerms = this.buildQueryTerms(q, filters?.semanticTerms);
    const categorySignals = q
      ? await this.resolveQueryCategorySignals(q, rawQueryTerms)
      : { categoryIds: [] as string[], semanticTerms: [] as string[] };
    const queryTerms = this.buildQueryTerms(q, [
      ...(filters?.semanticTerms ?? []),
      ...categorySignals.semanticTerms
    ]);
    const city = filters?.city?.trim() ?? "";
    const area = filters?.area?.trim() ?? "";
    const sortBy = this.sanitizeSortBy(filters?.sortBy);
    const hasPriceFilter =
      typeof filters?.minPrice === "number" || typeof filters?.maxPrice === "number";
    const hasCategoryFilter = Boolean(filters?.category?.trim());
    const hasAreaFilter = Boolean(area);

    if (queryTerms.length === 0 && !city && !hasAreaFilter && !hasPriceFilter && !hasCategoryFilter) {
      return [];
    }

    const andFilters: Prisma.ListingWhereInput[] = [];
    const nonQueryFilters: Prisma.ListingWhereInput[] = [];

    if (queryTerms.length > 0) {
      const queryOrClauses: Prisma.ListingWhereInput[] = [];
      for (const term of queryTerms) {
        queryOrClauses.push({ title: { contains: term, mode: "insensitive" } });
        queryOrClauses.push({ description: { contains: term, mode: "insensitive" } });
        queryOrClauses.push({
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
        });
      }

      if (categorySignals.categoryIds.length > 0) {
        queryOrClauses.push({
          categoryId: { in: categorySignals.categoryIds }
        });
      }

      andFilters.push({
        OR: queryOrClauses
      });
    }

    if (city) {
      const cityFilter: Prisma.ListingWhereInput = {
        OR: [
          { user: { city: { contains: city, mode: "insensitive" } } },
          { title: { contains: city, mode: "insensitive" } },
          { description: { contains: city, mode: "insensitive" } }
        ]
      };
      andFilters.push(cityFilter);
      nonQueryFilters.push(cityFilter);
    }

    if (area) {
      const areaFilter: Prisma.ListingWhereInput = {
        description: { contains: area, mode: "insensitive" }
      };
      andFilters.push(areaFilter);
      nonQueryFilters.push(areaFilter);
    }

    if (hasPriceFilter) {
      const priceFilter: Prisma.DecimalFilter = {};
      if (typeof filters?.minPrice === "number") {
        priceFilter.gte = new Prisma.Decimal(filters.minPrice);
      }
      if (typeof filters?.maxPrice === "number") {
        priceFilter.lte = new Prisma.Decimal(filters.maxPrice);
      }
      const priceWhere: Prisma.ListingWhereInput = { price: priceFilter };
      andFilters.push(priceWhere);
      nonQueryFilters.push(priceWhere);
    }

    if (hasCategoryFilter) {
      const categoryIds = await this.resolveCategoryIds(filters?.category ?? "");
      if (categoryIds.length > 0) {
        const categoryWhere: Prisma.ListingWhereInput = {
          categoryId: { in: categoryIds }
        };
        andFilters.push(categoryWhere);
        nonQueryFilters.push(categoryWhere);
      }
    }

    if (typeof filters?.isNegotiable === "boolean") {
      const negotiableWhere: Prisma.ListingWhereInput = {
        isNegotiable: filters.isNegotiable
      };
      andFilters.push(negotiableWhere);
      nonQueryFilters.push(negotiableWhere);
    }

    const take = Math.min(Math.max(limit, 1), 100);
    const candidateTake = q ? Math.min(Math.max(limit * 4, 48), 160) : take;

    const listings = await this.prisma.listing.findMany({
      where: {
        status: ListingStatus.ACTIVE,
        ...(andFilters.length > 0 ? { AND: andFilters } : {})
      },
      include: {
        media: {
          orderBy: { sortOrder: "asc" }
        },
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
            id: true,
            fullName: true,
            phone: true,
            updatedAt: true,
            deviceFingerprints: {
              orderBy: { lastSeenAt: "desc" },
              take: 1,
              select: { lastSeenAt: true }
            },
            trustScore: {
              select: { score: true }
            }
          }
        }
      },
      take: candidateTake
    });

    if (q) {
      const supplemental = await this.prisma.listing.findMany({
        where: {
          status: ListingStatus.ACTIVE,
          ...(nonQueryFilters.length > 0 ? { AND: nonQueryFilters } : {})
        },
        include: {
          media: {
            orderBy: { sortOrder: "asc" }
          },
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
              id: true,
              fullName: true,
              phone: true,
              updatedAt: true,
              deviceFingerprints: {
                orderBy: { lastSeenAt: "desc" },
                take: 1,
                select: { lastSeenAt: true }
              },
              trustScore: {
                select: { score: true }
              }
            }
          }
        },
        take: Math.min(Math.max(limit * 8, 96), 220)
      });

      const merged = this.mergeListingsById([...listings, ...supplemental]);
      const threshold = this.minimumSemanticScore(queryTerms);
      const ranked = merged
        .map((item) => {
          const categoryPath = this.buildCategorySearchText(item.category);
          const text = `${item.title} ${item.description} ${categoryPath}`.toLowerCase();
          const score = this.computeSemanticScore({
            query: q,
            terms: queryTerms,
            title: item.title,
            text,
            categoryPath,
            trust: item.user?.trustScore?.score ?? 0
          });

          return { item, score };
        })
        .filter(({ item, score }) => score >= threshold || listings.some((entry) => entry.id === item.id))
        .sort((a, b) => {
          if (a.score !== b.score) {
            return b.score - a.score;
          }

          const aTrust = a.item.user?.trustScore?.score ?? 0;
          const bTrust = b.item.user?.trustScore?.score ?? 0;
          if (aTrust !== bTrust) {
            return bTrust - aTrust;
          }

          const aRank = Number(a.item.rankingScore ?? 0);
          const bRank = Number(b.item.rankingScore ?? 0);
          if (aRank !== bRank) {
            return bRank - aRank;
          }

          const aFreshness =
            a.item.createdAt ? Date.now() - new Date(a.item.createdAt).getTime() : Number.MAX_SAFE_INTEGER;
          const bFreshness =
            b.item.createdAt ? Date.now() - new Date(b.item.createdAt).getTime() : Number.MAX_SAFE_INTEGER;
          return aFreshness - bFreshness;
        })
        .map(({ item }) => item);

      const sorted = this.applyListingSort(ranked.slice(0, take), sortBy);
      return sorted.map((item) => this.normalizeListingForClient(item));
    }

    const sortedByRelevance = this.sortByTrustWeightedRanking(listings);
    const sorted = this.applyListingSort(sortedByRelevance.slice(0, take), sortBy);
    return sorted.map((item) => this.normalizeListingForClient(item));
  }

  async semanticSearch(
    query: string,
    limit = 20,
    filters?: {
      category?: string;
      minPrice?: number;
      maxPrice?: number;
      city?: string;
      area?: string;
      isNegotiable?: boolean;
      sortBy?: string;
    }
  ) {
    const semanticTerms = this.expandSemanticTerms(query);
    const hasQuery = semanticTerms.length > 0;
    const sortBy = this.sanitizeSortBy(filters?.sortBy);
    let base = await this.search(query, limit, {
      ...filters,
      semanticTerms
    });
    if (base.length === 0 && hasQuery && (filters?.category || filters?.city || filters?.area)) {
      base = await this.search("", limit, filters);
    }
    const q = query.trim().toLowerCase();
    if (!q) {
      return this.applyNormalizedSort(base, sortBy);
    }

    const ranked = [...base].sort((a, b) => {
      const aText = `${a.title} ${a.description}`.toLowerCase();
      const bText = `${b.title} ${b.description}`.toLowerCase();

      const aScore = this.computeSemanticScore({
        query: q,
        terms: semanticTerms,
        title: a.title,
        text: aText,
        trust: a.user?.trustScore?.score ?? 0
      });
      const bScore = this.computeSemanticScore({
        query: q,
        terms: semanticTerms,
        title: b.title,
        text: bText,
        trust: b.user?.trustScore?.score ?? 0
      });

      if (aScore !== bScore) {
        return bScore - aScore;
      }
      const aFreshness =
        a.createdAt ? Date.now() - new Date(a.createdAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bFreshness =
        b.createdAt ? Date.now() - new Date(b.createdAt).getTime() : Number.MAX_SAFE_INTEGER;
      return aFreshness - bFreshness;
    });

    return this.applyNormalizedSort(ranked, sortBy);
  }

  private computeSemanticScore(params: {
    query: string;
    terms: string[];
    title: string;
    text: string;
    categoryPath?: string;
    trust: number;
  }) {
    const titleLower = this.normalizeSearchText(params.title);
    const textLower = this.normalizeSearchText(params.text);
    const categoryLower = this.normalizeSearchText(params.categoryPath ?? "");
    const queryLower = this.normalizeSearchText(params.query);
    const titleTokens = this.tokenizeSearchText(params.title);
    const textTokens = this.tokenizeSearchText(params.text);
    const categoryTokens = this.tokenizeSearchText(params.categoryPath ?? "");
    let score = 0;

    if (titleLower === queryLower) {
      score += 9;
    } else if (titleLower.startsWith(queryLower)) {
      score += 7;
    } else if (titleLower.includes(queryLower)) {
      score += 5;
    }

    if (textLower.includes(queryLower)) {
      score += 2.5;
    }
    if (categoryLower.includes(queryLower)) {
      score += 3.4;
    }

    for (const term of params.terms) {
      if (term.length < 2) {
        continue;
      }
      const normalizedTerm = this.normalizeSearchText(term);
      if (titleLower === normalizedTerm) {
        score += 3.2;
      } else if (titleLower.startsWith(normalizedTerm)) {
        score += 2.6;
      } else if (titleLower.includes(normalizedTerm)) {
        score += 1.8;
      }
      if (textLower.includes(normalizedTerm)) {
        score += 0.7;
      }
      if (categoryLower.includes(normalizedTerm)) {
        score += 1.4;
      }
    }

    for (const token of this.tokenizeSearchText(params.query)) {
      if (titleTokens.includes(token)) {
        score += 2.3;
      } else if (this.hasFuzzyTokenMatch(titleTokens, token)) {
        score += 1.7;
      }

      if (categoryTokens.includes(token)) {
        score += 1.7;
      } else if (this.hasFuzzyTokenMatch(categoryTokens, token)) {
        score += 1.1;
      }

      if (textTokens.includes(token)) {
        score += 0.9;
      } else if (this.hasFuzzyTokenMatch(textTokens, token)) {
        score += 0.45;
      }
    }

    return score + params.trust / 120;
  }

  private sanitizeSortBy(sortBy?: string): ListingSearchSortBy {
    if (
      sortBy === "price_asc" ||
      sortBy === "price_desc" ||
      sortBy === "date_desc" ||
      sortBy === "date_asc"
    ) {
      return sortBy;
    }
    return "relevance";
  }

  private buildQueryTerms(query: string, extraTerms?: string[]) {
    const base = query
      .toLowerCase()
      .split(/[\s,./\\\-_:;]+/)
      .map((token) => this.normalizeToken(token))
      .filter((token) => token.length >= 2);
    const knownCities = [
      "karachi",
      "lahore",
      "islamabad",
      "rawalpindi",
      "faisalabad",
      "multan",
      "peshawar",
      "hyderabad",
      "quetta",
      "gujranwala",
      "sialkot",
      "sargodha"
    ];
    if (query.length >= 2) {
      base.unshift(this.normalizeSearchText(query));
    }

    for (const token of [...base]) {
      const normalized = token.replace(/\s+/g, "");
      if (normalized.length < 5) {
        continue;
      }
      for (const city of knownCities) {
        const index = normalized.indexOf(city);
        if (index < 0) {
          continue;
        }

        const before = normalized.slice(0, index);
        const after = normalized.slice(index + city.length);
        if (before.length >= 2) {
          base.push(before);
        }
        if (after.length >= 2) {
          base.push(after);
        }
        base.push(city);
      }
    }

    for (const token of [...base]) {
      base.push(this.toSingularToken(token));
      const synonyms = SEARCH_SYNONYM_MAP[token] ?? [];
      for (const synonym of synonyms) {
        base.push(this.normalizeSearchText(synonym));
      }
    }

    if (extraTerms?.length) {
      for (const term of extraTerms) {
        const clean = this.normalizeSearchText(term);
        if (clean.length >= 2) {
          base.push(clean);
        }
      }
    }

    return Array.from(new Set(base));
  }

  private applyNormalizedSort<
    T extends { price: string | number | Prisma.Decimal; createdAt?: string | Date | null }
  >(items: T[], sortBy: ListingSearchSortBy) {
    return this.applyListingSort(items, sortBy);
  }

  private applyListingSort<
    T extends { price: string | number | Prisma.Decimal; createdAt?: string | Date | null }
  >(items: T[], sortBy: ListingSearchSortBy) {
    if (sortBy === "relevance") {
      return items;
    }

    return [...items].sort((a, b) => {
      if (sortBy === "price_asc" || sortBy === "price_desc") {
        const aPrice = Number(a.price);
        const bPrice = Number(b.price);
        if (aPrice !== bPrice) {
          return sortBy === "price_asc" ? aPrice - bPrice : bPrice - aPrice;
        }
      }

      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (aDate !== bDate) {
        return sortBy === "date_asc" ? aDate - bDate : bDate - aDate;
      }
      return 0;
    });
  }

  async getListingById(listingId: string, viewerUserId?: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        media: {
          orderBy: { sortOrder: "asc" }
        },
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
            id: true,
            fullName: true,
            phone: true,
            updatedAt: true,
            deviceFingerprints: {
              orderBy: { lastSeenAt: "desc" },
              take: 1,
              select: { lastSeenAt: true }
            },
            trustScore: { select: { score: true } }
          }
        }
      }
    });

    if (!listing) {
      throw new NotFoundException("Listing not found.");
    }
    if (
      listing.status !== ListingStatus.ACTIVE &&
      (!viewerUserId || listing.userId !== viewerUserId)
    ) {
      throw new NotFoundException("Listing not found.");
    }

    return this.normalizeListingForClient(listing);
  }

  async getListingOffers(listingId: string, limit = 20, viewerUserId?: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, title: true, status: true, userId: true }
    });
    if (!listing) {
      throw new NotFoundException("Listing not found.");
    }
    if (
      listing.status !== ListingStatus.ACTIVE &&
      (!viewerUserId || listing.userId !== viewerUserId)
    ) {
      throw new NotFoundException("Listing not found.");
    }
    const canViewSenderContact =
      Boolean(viewerUserId) && listing.userId === viewerUserId;

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        type: ChatMessageType.TEXT,
        thread: {
          listingId
        }
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit * 4, 1), 100),
      select: {
        id: true,
        content: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            phone: true,
            city: true,
            fullName: true
          }
        }
      }
    });

    const normalizedMessages = messages
      .map((message) => {
        const clean = message.content.trim();
        if (!clean) {
          return null;
        }

        const senderName = message.sender.fullName.split(" ")[0] || "Buyer";
        const match =
          clean.match(/(?:offer|bid|pkr|rs\.?)\s*[:\-]?\s*([\d,]{4,})/i) ??
          clean.match(/\b([\d,]{5,})\b/);
        const amount = match?.[1] ? Number(match[1].replace(/,/g, "")) : null;

        return {
          id: message.id,
          createdAt: message.createdAt,
          senderId: message.sender.id,
          senderName,
          senderCity: message.sender.city || null,
          senderPhone: canViewSenderContact ? message.sender.phone || null : null,
          amount: Number.isFinite(amount) ? amount : null,
          content: clean.slice(0, 180)
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .slice(0, Math.min(Math.max(limit, 1), 20));

    const offers = normalizedMessages
      .filter((entry) => entry.amount !== null)
      .slice(0, Math.min(Math.max(limit, 1), 20));

    const recentMessages = normalizedMessages.slice(0, 8);

    return {
      listingId,
      listingTitle: listing.title,
      totalMessages: messages.length,
      offers,
      recentMessages
    };
  }

  async getMyListings(userId: string) {
    const listings = await this.prisma.listing.findMany({
      where: { userId },
      include: {
        media: {
          orderBy: { sortOrder: "asc" }
        },
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
        }
      },
      orderBy: { createdAt: "desc" }
    });
    return listings.map((item) => this.normalizeListingForClient(item));
  }

  private normalizeListingForClient<
    T extends {
      user?: {
        deviceFingerprints?: Array<{ lastSeenAt: Date }>;
        updatedAt?: Date;
      } | null;
      category?: {
        id: string;
        name: string;
        slug: string;
        parent?: {
          id: string;
          name: string;
          slug: string;
        } | null;
      } | null;
    }
  >(listing: T) {
    const categoryLabels = this.resolveCategoryLabels(
      listing.category
        ? {
            id: listing.category.id,
            name: listing.category.name,
            slug: listing.category.slug,
            parent: listing.category.parent
              ? {
                  id: listing.category.parent.id,
                  name: listing.category.parent.name,
                  slug: listing.category.parent.slug
                }
              : null
          }
        : null
    );

    if (!listing.user) {
      const descriptionRaw = (listing as { description?: unknown }).description;
      const description = typeof descriptionRaw === "string" ? descriptionRaw : "";
      const city = this.extractMetadataValue(description, "city");
      const exactLocation = this.extractMetadataValue(description, "location");
      return {
        ...listing,
        city: city || null,
        exactLocation: exactLocation || null,
        ...categoryLabels
      };
    }

    const user = listing.user as {
      deviceFingerprints?: Array<{ lastSeenAt: Date }>;
      updatedAt?: Date;
      [key: string]: unknown;
    };
    const { deviceFingerprints, ...restUser } = user;
    const lastSeenAt = deviceFingerprints?.[0]?.lastSeenAt ?? user.updatedAt ?? null;

    const descriptionRaw = (listing as { description?: unknown }).description;
    const description = typeof descriptionRaw === "string" ? descriptionRaw : "";
    return {
      ...listing,
      city: this.extractMetadataValue(description, "city") || null,
      exactLocation: this.extractMetadataValue(description, "location") || null,
      ...categoryLabels,
      user: {
        ...restUser,
        lastSeenAt
      }
    };
  }

  private resolveCategoryLabels(
    category:
      | {
          id: string;
          name: string;
          slug: string;
          parent?: {
            id: string;
            name: string;
            slug: string;
          } | null;
        }
      | null
      | undefined
  ) {
    if (!category) {
      return {
        mainCategoryName: null,
        mainCategorySlug: null,
        subCategoryName: null,
        subCategorySlug: null
      };
    }

    const mainCategory = category.parent ?? category;
    const subCategory = category.parent ? category : null;

    return {
      mainCategoryName: mainCategory.name,
      mainCategorySlug: mainCategory.slug,
      subCategoryName: subCategory?.name ?? null,
      subCategorySlug: subCategory?.slug ?? null
    };
  }

  private extractMetadataValue(description: string, key: "city" | "location") {
    const match = description.match(new RegExp(`\\b${key}\\s*:\\s*([^\\n]+)`, "i"));
    return match?.[1]?.trim() ?? "";
  }

  private expandSemanticTerms(query: string) {
    const tokens = this.tokenizeSearchText(query);
    const expanded = new Set(tokens);

    for (const token of tokens) {
      const synonyms = SEARCH_SYNONYM_MAP[token] ?? [];
      for (const synonym of synonyms) {
        expanded.add(this.normalizeSearchText(synonym));
      }
    }

    return Array.from(expanded);
  }

  private buildCategorySearchText(category?: {
    name?: string | null;
    slug?: string | null;
    parent?: { name?: string | null; slug?: string | null } | null;
  } | null) {
    if (!category) {
      return "";
    }

    return [
      category.parent?.name,
      category.parent?.slug,
      category.name,
      category.slug
    ]
      .filter(Boolean)
      .join(" ");
  }

  private async resolveQueryCategorySignals(query: string, queryTerms: string[]) {
    const normalizedQuery = this.normalizeSearchText(query);
    if (!normalizedQuery) {
      return {
        categoryIds: [] as string[],
        semanticTerms: [] as string[]
      };
    }

    const matchedSlugs = new Set<string>();
    const semanticTerms = new Set<string>();

    for (const root of marketplaceCategoryCatalog) {
      const rootTerms = this.buildCategoryAliasTerms(root.name, root.slug);
      const rootMatched = this.matchesCategorySearchQuery(normalizedQuery, queryTerms, rootTerms);

      if (rootMatched) {
        matchedSlugs.add(root.slug);
        for (const child of root.subcategories) {
          matchedSlugs.add(child.slug);
        }
        for (const term of rootTerms) {
          semanticTerms.add(term);
        }
      }

      for (const subcategory of root.subcategories) {
        const subTerms = this.buildCategoryAliasTerms(subcategory.name, subcategory.slug);
        const combinedTerms = [...rootTerms, ...subTerms];

        if (!this.matchesCategorySearchQuery(normalizedQuery, queryTerms, combinedTerms)) {
          continue;
        }

        matchedSlugs.add(root.slug);
        matchedSlugs.add(subcategory.slug);
        for (const child of root.subcategories) {
          matchedSlugs.add(child.slug);
        }
        for (const term of combinedTerms) {
          semanticTerms.add(term);
        }
      }
    }

    if (matchedSlugs.size === 0) {
      return {
        categoryIds: [] as string[],
        semanticTerms: [] as string[]
      };
    }

    const rows = await this.prisma.category.findMany({
      where: {
        slug: {
          in: Array.from(matchedSlugs)
        }
      },
      select: { id: true }
    });

    return {
      categoryIds: rows.map((row) => row.id),
      semanticTerms: Array.from(semanticTerms)
    };
  }

  private buildCategoryAliasTerms(name: string, slug: string) {
    const base = new Set<string>();
    const sourceTerms = [
      this.normalizeSearchText(name),
      this.normalizeSearchText(slug.replace(/-/g, " "))
    ];

    for (const source of sourceTerms) {
      if (!source) {
        continue;
      }
      base.add(source);
      for (const token of this.tokenizeSearchText(source)) {
        base.add(token);
        base.add(this.toSingularToken(token));
        const synonyms = SEARCH_SYNONYM_MAP[token] ?? [];
        for (const synonym of synonyms) {
          base.add(this.normalizeSearchText(synonym));
        }
      }
    }

    return Array.from(base).filter((term) => term.length >= 2);
  }

  private matchesCategorySearchQuery(
    normalizedQuery: string,
    queryTerms: string[],
    categoryTerms: string[]
  ) {
    const relevantTerms = new Set<string>([
      normalizedQuery,
      ...queryTerms.map((term) => this.normalizeSearchText(term)),
      ...categoryTerms.map((term) => this.normalizeSearchText(term))
    ]);
    const categoryTokens = Array.from(new Set(categoryTerms.flatMap((term) => this.tokenizeSearchText(term))));

    for (const term of relevantTerms) {
      if (!term || term.length < 2) {
        continue;
      }

      if (categoryTerms.some((categoryTerm) => categoryTerm.includes(term) || term.includes(categoryTerm))) {
        return true;
      }

      const termTokens = this.tokenizeSearchText(term);
      if (
        termTokens.some(
          (token) =>
            categoryTokens.includes(token) || this.hasFuzzyTokenMatch(categoryTokens, token)
        )
      ) {
        return true;
      }
    }

    return false;
  }

  private minimumSemanticScore(queryTerms: string[]) {
    if (queryTerms.length <= 1) {
      return 1.15;
    }

    if (queryTerms.length <= 3) {
      return 1.4;
    }

    return 1.6;
  }

  private mergeListingsById<
    T extends { id: string }
  >(items: T[]) {
    const merged = new Map<string, T>();
    for (const item of items) {
      if (!merged.has(item.id)) {
        merged.set(item.id, item);
      }
    }
    return Array.from(merged.values());
  }

  private normalizeSearchText(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private normalizeToken(value: string) {
    return this.normalizeSearchText(value).replace(/\s+/g, "");
  }

  private tokenizeSearchText(value: string) {
    const normalized = this.normalizeSearchText(value);
    if (!normalized) {
      return [];
    }

    const tokens = normalized
      .split(/\s+/)
      .map((token) => this.normalizeToken(token))
      .filter((token) => token.length >= 2);

    const expanded = new Set<string>();
    for (const token of tokens) {
      expanded.add(token);
      expanded.add(this.toSingularToken(token));
    }
    return Array.from(expanded).filter((token) => token.length >= 2);
  }

  private toSingularToken(token: string) {
    if (token.endsWith("ies") && token.length > 4) {
      return `${token.slice(0, -3)}y`;
    }
    if (token.endsWith("es") && token.length > 4) {
      return token.slice(0, -2);
    }
    if (token.endsWith("s") && token.length > 3) {
      return token.slice(0, -1);
    }
    return token;
  }

  private hasFuzzyTokenMatch(tokens: string[], target: string) {
    const normalizedTarget = this.toSingularToken(this.normalizeToken(target));
    if (normalizedTarget.length < 3) {
      return false;
    }

    return tokens.some((token) => {
      const normalizedToken = this.toSingularToken(this.normalizeToken(token));
      if (!normalizedToken || Math.abs(normalizedToken.length - normalizedTarget.length) > 2) {
        return false;
      }

      if (normalizedToken === normalizedTarget) {
        return true;
      }

      const maxDistance = Math.max(normalizedToken.length, normalizedTarget.length) >= 7 ? 2 : 1;
      return this.levenshteinDistance(normalizedToken, normalizedTarget) <= maxDistance;
    });
  }

  private levenshteinDistance(a: string, b: string) {
    if (a === b) {
      return 0;
    }
    if (!a.length) {
      return b.length;
    }
    if (!b.length) {
      return a.length;
    }

    const matrix = Array.from({ length: a.length + 1 }, () =>
      Array<number>(b.length + 1).fill(0)
    );

    for (let i = 0; i <= a.length; i += 1) {
      matrix[i][0] = i;
    }
    for (let j = 0; j <= b.length; j += 1) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= a.length; i += 1) {
      for (let j = 1; j <= b.length; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[a.length][b.length];
  }

  private validateMediaConstraints(
    media: Array<{ type: ListingMediaType; durationSec?: number }>
  ) {
    const images = media.filter((item) => item.type === ListingMediaType.IMAGE);
    const videos = media.filter((item) => item.type === ListingMediaType.VIDEO);

    if (images.length < 2) {
      throw new UnprocessableEntityException(
        "Kam az kam 2 images upload karni zaroori hain."
      );
    }
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

  private assertListingContentQuality(description: string, city?: string) {
    const cleanDescription = description.trim();
    const hasCityInput = Boolean(city?.trim());
    const hasLocationHint =
      /\b(city|location)\b/i.test(cleanDescription) ||
      /\n\s*city\s*:/i.test(cleanDescription) ||
      /\n\s*location\s*:/i.test(cleanDescription);

    if (!hasCityInput && !hasLocationHint) {
      throw new UnprocessableEntityException(
        "Location required hai. Aap kahan hain? field fill karein."
      );
    }
  }

  private buildNormalizedDescription(description: string, city?: string) {
    const cleanDescription = description.trim();
    const cleanCity = city?.trim();

    if (!cleanCity) {
      return cleanDescription;
    }

    if (/\n\s*city\s*:/i.test(cleanDescription)) {
      return cleanDescription;
    }

    return `${cleanDescription}\n\nCity: ${cleanCity}`;
  }

  private async resolveCategoryIds(categoryFilter: string) {
    const value = categoryFilter.trim();
    if (!value) {
      return [];
    }

    const selected = await this.prisma.category.findFirst({
      where: {
        OR: [{ id: value }, { slug: value }]
      },
      select: { id: true }
    });

    if (!selected) {
      return [];
    }

    const children = await this.prisma.category.findMany({
      where: { parentId: selected.id },
      select: { id: true }
    });

    return [selected.id, ...children.map((item) => item.id)];
  }

  private async resolveCategoryReference(categoryRef: string) {
    const value = categoryRef.trim();
    if (!value) {
      throw new BadRequestException("Category is required.");
    }

    const category = await this.prisma.category.findFirst({
      where: {
        OR: [{ id: value }, { slug: value }]
      },
      select: { id: true }
    });

    if (!category) {
      throw new BadRequestException("Invalid category.");
    }

    return category.id;
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

  private async assertPhoneVerified(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phoneVerifiedAt: true }
    });

    if (!user?.phoneVerifiedAt) {
      throw new ForbiddenException(
        "Phone verification required. Please complete OTP verification before posting."
      );
    }
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
