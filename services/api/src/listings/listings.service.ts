import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException
} from "@nestjs/common";
import {
  ChatMessageType,
  ChatThreadStatus,
  ListingMediaType,
  ListingStatus,
  Prisma
} from "@prisma/client";
import { marketplaceCategoryCatalog } from "@aikad/shared";
import {
  buildCategorySearchText as buildCategorySearchTextValue,
  buildQueryTerms as buildQueryTermsValue,
  detectQueryCategorySignals,
  expandSemanticTerms as expandSemanticTermsValue,
  minimumSemanticScore as minimumSemanticScoreValue,
  scoreSearchDocument
} from "../search/search-intelligence";
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
    return scoreSearchDocument(params);
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
    return buildQueryTermsValue(query, extraTerms);
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
    return expandSemanticTermsValue(query);
  }

  private buildCategorySearchText(category?: {
    name?: string | null;
    slug?: string | null;
    parent?: { name?: string | null; slug?: string | null } | null;
  } | null) {
    return buildCategorySearchTextValue(category);
  }

  private async resolveQueryCategorySignals(query: string, queryTerms: string[]) {
    const signals = detectQueryCategorySignals(query, queryTerms);
    if (signals.matchedSlugs.length === 0) {
      return {
        categoryIds: [] as string[],
        semanticTerms: [] as string[]
      };
    }

    const rows = await this.prisma.category.findMany({
      where: {
        slug: {
          in: signals.matchedSlugs
        }
      },
      select: { id: true }
    });

    return {
      categoryIds: rows.map((row) => row.id),
      semanticTerms: signals.semanticTerms
    };
  }

  private minimumSemanticScore(queryTerms: string[]) {
    return minimumSemanticScoreValue(queryTerms);
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
