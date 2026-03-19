import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Condition,
  InspectionVerdict,
  Listing,
  NotificationType,
  Prisma,
  StoreType,
  User,
} from '@prisma/client';
import Redis from 'ioredis';
import {
  getCategoryDefinitionBySlug,
  getMinimumPriceForListing,
  getSubcategoryDefinition,
  type ListingAttributes,
  type ListingFeatureDefinition,
} from '@tgmg/types';
import type { PaginatedResponse } from '@tgmg/types';
import { ListingsRepository } from './listings.repository';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingFilterDto } from './dto/listing-filter.dto';
import { CreateListingMessageDto } from './dto/create-listing-message.dto';
import { CreateOfferDto } from './dto/create-offer.dto';
import { PushNotificationsService } from '../notifications/push-notifications.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ListingsService {
  private readonly redis: Redis;
  private readonly sellerSelect = {
    id: true,
    name: true,
    city: true,
    area: true,
    verified: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  constructor(
    private readonly listingsRepository: ListingsRepository,
    private readonly prisma: PrismaService,
    private readonly pushNotificationsService: PushNotificationsService,
  ) {
    this.redis = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379', {
      maxRetriesPerRequest: 1,
    });
  }

  async create(userId: string, dto: CreateListingDto) {
    const resolvedCategory = await this.resolveCategory(dto.categoryId);
    const resolvedCategoryId = resolvedCategory.id;
    const requiresInspection = this.requiresPreListingInspection(resolvedCategory.slug);
    const structuredInput = this.validateStructuredListingInput({
      categorySlug: resolvedCategory.slug,
      price: dto.price,
      subcategorySlug: dto.subcategorySlug,
      attributes: dto.attributes,
      requireSubcategory: true,
    });
    const activeCount = await this.listingsRepository.countActiveByUserAndCategory(
      userId,
      resolvedCategoryId,
    );

    if (activeCount >= 3) {
      throw new ConflictException(
        'Aap is category mein maximum 3 active ads post kar sakte hain.',
      );
    }

    const isStore = dto.isStore === true;
    if (isStore && !dto.storeType) {
      throw new BadRequestException('Dukaan ad ke liye store type select karein.');
    }

    const createData = {
      userId,
      title: dto.title,
      description: dto.description,
      price: dto.price,
      categoryId: resolvedCategoryId,
      subcategorySlug: structuredInput.subcategory?.slug,
      subcategoryName: structuredInput.subcategory?.name,
      attributes: structuredInput.attributes ?? Prisma.JsonNull,
      images: dto.images,
      videos: dto.videos ?? [],
      condition: dto.condition,
      isStore,
      storeType: isStore ? dto.storeType : null,
      city: dto.city,
      area: dto.area,
      lat: dto.lat,
      lng: dto.lng,
      status: requiresInspection ? 'PENDING' : 'ACTIVE',
      inspectionStatus: requiresInspection ? 'SUBMITTED' : 'NONE',
    } as Prisma.ListingUncheckedCreateInput;

    if (requiresInspection) {
      if (!dto.workshopPartnerId?.trim()) {
        throw new BadRequestException(
          'Cars aur Motorcycles ad ke liye pehle workshop select karna zaroori hai.',
        );
      }
      if (!dto.inspectionReportPdfUrl?.trim()) {
        throw new BadRequestException(
          'Cars aur Motorcycles ad ke liye readable inspection PDF submit karna zaroori hai.',
        );
      }
      if (!/\.pdf(\?|$)/i.test(dto.inspectionReportPdfUrl)) {
        throw new BadRequestException('Sirf PDF inspection form upload kiya ja sakta hai.');
      }
    }

    const listing = await this.prisma.$transaction(async (tx) => {
      const created = await tx.listing.create({
        data: createData,
        include: {
          category: true,
          user: {
            select: this.sellerSelect,
          },
        },
      });

      if (requiresInspection) {
        const workshop = await tx.workshopPartner.findUnique({
          where: { id: dto.workshopPartnerId! },
        });
        if (!workshop || !workshop.active) {
          throw new BadRequestException('Selected workshop available nahi hai.');
        }

        const inspectionRequest = await tx.inspectionRequest.create({
          data: {
            listingId: created.id,
            sellerId: userId,
            workshopPartnerId: dto.workshopPartnerId!,
            status: 'SUBMITTED',
            submittedAt: new Date(),
            offlinePaymentAcknowledged: true,
          },
        });

        await tx.inspectionReport.create({
          data: {
            inspectionRequestId: inspectionRequest.id,
            vehicleInfo: {} as Prisma.InputJsonValue,
            ownerVerification: {} as Prisma.InputJsonValue,
            avlsVerification: {} as Prisma.InputJsonValue,
            mechanicalChecklist: {} as Prisma.InputJsonValue,
            bodyChecklist: {} as Prisma.InputJsonValue,
            interiorChecklist: {} as Prisma.InputJsonValue,
            tyreChecklist: {} as Prisma.InputJsonValue,
            evidencePhotos: [],
            formPageFrontUrl: dto.inspectionReportPdfUrl!,
            overallRating: 3,
            verdict: InspectionVerdict.CAUTION,
            signatures: {
              sellerSubmitted: true,
            } as Prisma.InputJsonValue,
            stamps: {
              submissionMode: 'pdf-only-prelisting',
            } as Prisma.InputJsonValue,
          },
        });

        await tx.inspectionAuditLog.create({
          data: {
            inspectionRequestId: inspectionRequest.id,
            actorUserId: userId,
            actorRole: 'USER',
            action: 'PRELISTING_REPORT_SUBMITTED',
            payload: {
              workshopPartnerId: dto.workshopPartnerId!,
              inspectionReportPdfUrl: dto.inspectionReportPdfUrl!,
            } as Prisma.InputJsonValue,
          },
        });
      }

      return created;
    });

    await this.notifyCategoryWatchers(listing);
    return listing;
  }

  async findAll(
    filter: ListingFilterDto,
  ): Promise<PaginatedResponse<Listing & { category: unknown; user: unknown }>> {
    const publicVisibilityWhere = this.publicVisibilityWhere();
    const normalizedQ = filter.q?.trim();
    const storeType =
      filter.storeType ??
      (filter.store === 'online'
        ? 'ONLINE'
        : filter.store === 'road'
          ? 'ROAD'
          : undefined);
    const isStore = storeType ? true : filter.isStore ?? false;
    const where: Prisma.ListingWhereInput = {
      ...publicVisibilityWhere,
      isStore,
      ...(filter.city
        ? { city: { equals: filter.city.trim(), mode: 'insensitive' } }
        : {}),
      ...(filter.condition ? { condition: filter.condition } : {}),
      ...(storeType ? { storeType } : {}),
      ...(typeof filter.minPrice === 'number' || typeof filter.maxPrice === 'number'
        ? {
            price: {
              ...(typeof filter.minPrice === 'number' ? { gte: filter.minPrice } : {}),
              ...(typeof filter.maxPrice === 'number' ? { lte: filter.maxPrice } : {}),
            },
          }
        : {}),
      ...(filter.category ? { category: { slug: filter.category } } : {}),
      ...(normalizedQ
        ? {
            OR: [
              { title: { contains: normalizedQ, mode: 'insensitive' } },
              { description: { contains: normalizedQ, mode: 'insensitive' } },
              { category: { name: { contains: normalizedQ, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const safePage = Math.max(1, Number(filter.page ?? 1));
    const safeLimit = Math.max(1, Math.min(50, Number(filter.limit ?? 20)));
    const orderBy =
      filter.sort === 'price_asc'
        ? ({ price: 'asc' } as const)
        : filter.sort === 'price_desc'
          ? ({ price: 'desc' } as const)
          : ({ createdAt: 'desc' } as const);

    let data: Array<Listing & { category: unknown; user: unknown }> = [];
    let total = 0;

    if (normalizedQ) {
      const searchIds = await this.listingsRepository.searchListingIds({
        q: normalizedQ,
        category: filter.category,
        city: filter.city,
        condition: filter.condition as Condition | undefined,
        isStore,
        storeType: storeType as StoreType | undefined,
        minPrice: filter.minPrice,
        maxPrice: filter.maxPrice,
        limit: safeLimit * 3,
        offset: (safePage - 1) * safeLimit,
      });

      if (searchIds.length) {
        const rows = await this.listingsRepository.findMany({
          where: { id: { in: searchIds } },
          include: {
            category: true,
            user: {
              select: this.sellerSelect,
            },
          },
        });
        const rowMap = new Map(rows.map((row) => [row.id, row]));
        data = searchIds
          .map((id) => rowMap.get(id))
          .filter((row): row is (typeof rows)[number] => Boolean(row));
      }
      total = await this.listingsRepository.count({ where });
    } else {
      const [rows, count] = await Promise.all([
        this.listingsRepository.findMany({
          where,
          orderBy,
          skip: (safePage - 1) * safeLimit,
          take: safeLimit,
          include: {
            category: true,
            user: {
              select: this.sellerSelect,
            },
          },
        }),
        this.listingsRepository.count({ where }),
      ]);
      data = rows;
      total = count;
    }

    const withDistance = this.applyDistanceSorting(data, filter);

    const paged = normalizedQ ? withDistance.slice(0, safeLimit) : withDistance;

    return {
      data: paged,
      total,
      page: safePage,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  private requiresPreListingInspection(categorySlug?: string | null) {
    return categorySlug === 'cars' || categorySlug === 'motorcycles';
  }

  async featured() {
    return this.listingsRepository.findMany({
      where: { ...this.publicVisibilityWhere(), isStore: false },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        category: true,
        user: {
          select: this.sellerSelect,
        },
      },
    });
  }

  async byCategory(slug: string, filter: ListingFilterDto) {
    return this.findAll({
      ...filter,
      category: slug,
    });
  }

  async findOne(id: string) {
    const listing = await this.listingsRepository.findUnique({
      where: { id },
      include: {
        category: true,
        user: {
          select: this.sellerSelect,
        },
      },
    });

    if (!listing || !this.isPubliclyVisible(listing.status, listing.createdAt, listing.updatedAt)) {
      throw new NotFoundException('Listing not found');
    }

    const count = await this.redis.incr(`views:${id}`);
    await this.prisma.listingViewLog.create({
      data: { listingId: id },
    });

    if (count % 100 === 0) {
      await this.listingsRepository.update({
        where: { id },
        data: { views: { increment: 100 } },
      });
    }

    return listing;
  }

  async contact(id: string, currentUser: User) {
    const listing = await this.listingsRepository.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!listing || listing.status !== 'ACTIVE') {
      throw new NotFoundException('Listing not found');
    }

    await this.listingsRepository.createContactLog({
      userId: currentUser.id,
      listingId: id,
    });

    if (listing.userId !== currentUser.id) {
      await this.pushNotificationsService.notifyUsers([listing.userId], {
        title: 'Aapki listing pe contact hua',
        body: `"${listing.title}" dekhne wale ne phone reveal kiya`,
        href: `/listings/${listing.id}`,
        type: NotificationType.CONTACT,
        data: { href: `/listings/${listing.id}`, type: 'contact' },
      });
    }

    return { phone: listing.user.phone };
  }

  async updateListing(id: string, currentUser: User, dto: UpdateListingDto) {
    const listing = await this.listingsRepository.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.userId !== currentUser.id) {
      throw new ForbiddenException();
    }

    const nextIsStore = dto.isStore ?? listing.isStore;
    const nextStoreType = nextIsStore
      ? dto.storeType ?? listing.storeType
      : null;
    const resolvedCategory = dto.categoryId
      ? await this.resolveCategory(dto.categoryId)
      : undefined;
    const resolvedCategoryId = resolvedCategory?.id;
    if (nextIsStore && !nextStoreType) {
      throw new BadRequestException('Dukaan ad ke liye store type select karein.');
    }

    const nextSubcategorySlug = resolvedCategory
      ? dto.subcategorySlug
      : dto.subcategorySlug ?? ((listing as any).subcategorySlug as string | undefined) ?? undefined;

    const structuredInput = this.validateStructuredListingInput({
      categorySlug: resolvedCategory?.slug ?? listing.category.slug,
      price: dto.price ?? listing.price,
      subcategorySlug: nextSubcategorySlug,
      attributes: dto.attributes ?? this.toListingAttributes((listing as any).attributes),
      requireSubcategory: false,
    });

    const previousPrice = listing.price;
    const updateData = {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.price !== undefined ? { price: dto.price } : {}),
      ...(dto.images !== undefined ? { images: dto.images } : {}),
      ...(dto.videos !== undefined ? { videos: dto.videos } : {}),
      ...(dto.condition !== undefined ? { condition: dto.condition } : {}),
      ...(dto.isFeatured !== undefined ? { isFeatured: dto.isFeatured } : {}),
      ...((dto.isStore !== undefined || dto.storeType !== undefined)
        ? { isStore: nextIsStore, storeType: nextStoreType }
        : {}),
      ...(resolvedCategoryId !== undefined
        ? { category: { connect: { id: resolvedCategoryId } } }
        : {}),
      ...(dto.subcategorySlug !== undefined || resolvedCategoryId !== undefined
        ? {
            subcategorySlug: structuredInput.subcategory?.slug ?? null,
            subcategoryName: structuredInput.subcategory?.name ?? null,
          }
        : {}),
      ...(dto.attributes !== undefined || dto.subcategorySlug !== undefined || resolvedCategoryId !== undefined
        ? { attributes: structuredInput.attributes ?? Prisma.JsonNull }
        : {}),
      ...(dto.city !== undefined ? { city: dto.city } : {}),
      ...(dto.area !== undefined ? { area: dto.area } : {}),
      ...(dto.lat !== undefined ? { lat: dto.lat } : {}),
      ...(dto.lng !== undefined ? { lng: dto.lng } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    } as Prisma.ListingUpdateInput;

    const updated = await this.listingsRepository.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        user: {
          select: this.sellerSelect,
        },
      },
    });

    if (previousPrice !== updated.price) {
      await this.notifySavedUsersOfUpdate(updated.id, updated.title);
    }

    return updated;
  }

  async remove(id: string, currentUser: User) {
    const listing = await this.listingsRepository.findUnique({
      where: { id },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.userId !== currentUser.id) {
      throw new ForbiddenException();
    }

    return this.listingsRepository.update({
      where: { id },
      data: { status: 'DELETED' },
    });
  }

  async mine(currentUser: User, filter: ListingFilterDto) {
    const where: Prisma.ListingWhereInput = { userId: currentUser.id };
    const [data, total] = await Promise.all([
      this.listingsRepository.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
        include: {
          category: true,
          user: {
            select: this.sellerSelect,
          },
        },
      }),
      this.listingsRepository.count({ where }),
    ]);

    return {
      data,
      total,
      page: filter.page,
      totalPages: Math.max(1, Math.ceil(total / filter.limit)),
    };
  }

  async save(id: string, currentUser: User) {
    await this.ensureListingExists(id);
    return this.listingsRepository.upsertSavedAd(currentUser.id, id);
  }

  async unsave(id: string, currentUser: User) {
    await this.ensureListingExists(id);
    return this.listingsRepository.deleteSavedAd(currentUser.id, id);
  }

  async saved(currentUser: User) {
    const savedAds = await this.listingsRepository.findMany({
      where: {
        ...this.publicVisibilityWhere(),
        savedBy: { some: { userId: currentUser.id } },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        user: {
          select: this.sellerSelect,
        },
      },
    });

    return savedAds;
  }

  private async ensureListingExists(id: string) {
    const listing = await this.listingsRepository.findUnique({ where: { id } });

    if (!listing || listing.status === 'DELETED') {
      throw new NotFoundException('Listing not found');
    }

    return listing;
  }

  async getPublicThread(id: string) {
    const listing = await this.ensureListingExists(id);
    await this.listingsRepository.findOrCreateThread(id);

    const thread = await this.listingsRepository.getThreadWithMessages(id);
    const offers = await this.listingsRepository.findOffersForListing(id);

    const nearestOffer = offers.length
      ? [...offers].sort(
          (a, b) =>
            Math.abs(a.amount - listing.price) - Math.abs(b.amount - listing.price),
        )[0]
      : null;

    const bestOffer = offers.length
      ? [...offers].sort((a, b) => b.amount - a.amount)[0]
      : null;

    return {
      listingId: id,
      messages: thread?.messages ?? [],
      offers,
      nearestOffer,
      bestOffer,
    };
  }

  async postMessage(id: string, currentUser: User, dto: CreateListingMessageDto) {
    await this.ensureListingExists(id);
    const throttleKey = `chat_msg:${id}:${currentUser.id}`;
    const count = await this.redis.incr(throttleKey);
    if (count === 1) await this.redis.expire(throttleKey, 20);
    if (count > 4) {
      throw new HttpException(
        'Bohat tez messages bhej rahe hain, thori dair baad try karein.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const thread = await this.listingsRepository.findOrCreateThread(id);
    const messagePayload = this.buildChatMessagePayload(dto.message, dto.imageUrl);
    if (!messagePayload) {
      throw new BadRequestException('Message ya image required hai.');
    }

    return this.listingsRepository.createThreadMessage({
      threadId: thread.id,
      userId: currentUser.id,
      message: messagePayload,
      offerAmount: null,
    });
  }

  async placeOffer(id: string, currentUser: User, dto: CreateOfferDto) {
    await this.ensureListingExists(id);
    const throttleKey = `offer_msg:${id}:${currentUser.id}`;
    const count = await this.redis.incr(throttleKey);
    if (count === 1) await this.redis.expire(throttleKey, 30);
    if (count > 3) {
      throw new HttpException(
        'Offer limit hit ho gayi, thori dair baad dobara try karein.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const thread = await this.listingsRepository.findOrCreateThread(id);
    const offer = await this.listingsRepository.createOffer({
      listingId: id,
      userId: currentUser.id,
      amount: dto.amount,
    });

    await this.listingsRepository.createThreadMessage({
      threadId: thread.id,
      userId: currentUser.id,
      message: `Offer di: PKR ${dto.amount.toLocaleString()}`,
      offerAmount: dto.amount,
    });

    return offer;
  }

  async searchSuggestions(q: string) {
    return this.listingsRepository.findSuggestions(q, 8);
  }

  async popularSearches() {
    return this.listingsRepository.findPopularSuggestions(8);
  }

  async dashboard(currentUser: User) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const listings = await this.prisma.listing.findMany({
      where: { userId: currentUser.id },
      select: {
        id: true,
        views: true,
        status: true,
        isFeatured: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const listingIds = listings.map((listing) => listing.id);
    const [contactCount, groupedContacts, groupedViews, savedCount, groupedSaves] = listingIds.length
      ? await Promise.all([
          this.prisma.contactLog.count({
            where: { listingId: { in: listingIds } },
          }),
          this.prisma.contactLog.findMany({
            where: {
              listingId: { in: listingIds },
              createdAt: { gte: sevenDaysAgo },
            },
            select: { createdAt: true },
          }),
          this.prisma.listingViewLog.findMany({
            where: {
              listingId: { in: listingIds },
              createdAt: { gte: sevenDaysAgo },
            },
            select: { createdAt: true },
          }),
          this.prisma.savedAd.count({
            where: { listingId: { in: listingIds } },
          }),
          this.prisma.savedAd.findMany({
            where: {
              listingId: { in: listingIds },
              createdAt: { gte: sevenDaysAgo },
            },
            select: { createdAt: true },
          }),
        ])
      : [0, [], [], 0, []];

    const totalViews = await this.prisma.listingViewLog.count({
      where: {
        listingId: { in: listingIds },
      },
    });
    const points = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      return {
        label: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        views: groupedViews.filter(
          (entry) => entry.createdAt >= date && entry.createdAt < nextDate,
        ).length,
        contacts: groupedContacts.filter(
          (entry) => entry.createdAt >= date && entry.createdAt < nextDate,
        ).length,
        saves: groupedSaves.filter(
          (entry) => entry.createdAt >= date && entry.createdAt < nextDate,
        ).length,
        listings: listings.filter(
          (entry) => entry.createdAt >= date && entry.createdAt < nextDate,
        ).length,
      };
    });

    return {
      totalViews,
      totalContacts: contactCount,
      activeListings: listings.filter((listing) => listing.status === 'ACTIVE').length,
      soldListings: listings.filter((listing) => listing.status === 'SOLD').length,
      inactiveListings: listings.filter((listing) => listing.status === 'INACTIVE' || listing.status === 'DELETED').length,
      featuredListings: listings.filter((listing) => listing.status === 'ACTIVE' && listing.isFeatured).length,
      averageViewsPerListing: listings.length ? Number((totalViews / listings.length).toFixed(1)) : 0,
      averageContactsPerListing: listings.length ? Number((contactCount / listings.length).toFixed(1)) : 0,
      contactRate: totalViews ? Number(((contactCount / totalViews) * 100).toFixed(1)) : 0,
      sellThroughRate: listings.length
        ? Number(((listings.filter((listing) => listing.status === 'SOLD').length / listings.length) * 100).toFixed(1))
        : 0,
      recentLeads: groupedContacts.length,
      funnel: {
        views: totalViews,
        contacts: contactCount,
        saves: savedCount,
        sold: listings.filter((listing) => listing.status === 'SOLD').length,
      },
      points,
    };
  }

  async analytics(currentUser: User) {
    return this.dashboard(currentUser);
  }

  private applyDistanceSorting(
    listings: Array<Listing & { category: unknown; user: unknown }>,
    filter: ListingFilterDto,
  ) {
    if (typeof filter.lat !== 'number' || typeof filter.lng !== 'number') {
      return listings;
    }

    const radius = filter.radiusKm ?? 10;
    const enriched = listings.map((listing) => {
      if (typeof listing.lat !== 'number' || typeof listing.lng !== 'number') {
        return {
          ...listing,
          distanceKm: null,
          isNearby: false,
        };
      }

      const distanceKm = Number(
        this.haversineDistance(filter.lat!, filter.lng!, listing.lat, listing.lng).toFixed(1),
      );

      return {
        ...listing,
        distanceKm,
        isNearby: distanceKm <= radius,
      };
    });

    const nearby = enriched.filter((listing) => listing.isNearby);
    const far = enriched.filter((listing) => !listing.isNearby);

    const sortByDistance = (a: { distanceKm: number | null }, b: { distanceKm: number | null }) => {
      const d1 = a.distanceKm ?? Number.POSITIVE_INFINITY;
      const d2 = b.distanceKm ?? Number.POSITIVE_INFINITY;
      return d1 - d2;
    };

    nearby.sort(sortByDistance);
    far.sort(sortByDistance);

    return nearby.length ? [...nearby, ...far] : [...nearby, ...far];
  }

  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private async resolveCategory(input: string) {
    const direct = await this.listingsRepository.findCategoryById(input);
    if (direct) return direct;

    const bySlug = await this.listingsRepository.findCategoryBySlug(input);
    if (bySlug) return bySlug;

    throw new BadRequestException('Selected category valid nahi hai. Dobara category choose karein.');
  }

  private validateStructuredListingInput(params: {
    categorySlug: string;
    price: number;
    subcategorySlug?: string;
    attributes?: ListingAttributes;
    requireSubcategory: boolean;
  }) {
    const categoryDefinition = getCategoryDefinitionBySlug(params.categorySlug);
    const subcategory = getSubcategoryDefinition(params.categorySlug, params.subcategorySlug);

    if (params.requireSubcategory && !subcategory) {
      throw new BadRequestException('Is category ke liye sub-category select karna zaroori hai.');
    }

    const minimumPrice = getMinimumPriceForListing(params.categorySlug, subcategory?.slug);
    if (params.price < minimumPrice) {
      throw new BadRequestException(
        `${subcategory?.name ?? categoryDefinition?.name ?? 'Is item'} ke liye minimum price PKR ${minimumPrice.toLocaleString()} hai.`,
      );
    }

    if (!subcategory) {
      return {
        subcategory: null,
        attributes: params.attributes,
      };
    }

    const normalized: ListingAttributes = {};
    for (const feature of subcategory.features) {
      const rawValue = params.attributes?.[feature.key];
      const normalizedValue = this.normalizeFeatureValue(feature, rawValue);
      if (feature.required && normalizedValue === undefined) {
        throw new BadRequestException(`${feature.label} fill karna zaroori hai.`);
      }
      if (normalizedValue !== undefined) {
        normalized[feature.key] = normalizedValue;
      }
    }

    return {
      subcategory,
      attributes: normalized,
    };
  }

  private normalizeFeatureValue(
    feature: ListingFeatureDefinition,
    rawValue: ListingAttributes[string] | undefined,
  ) {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      return undefined;
    }

    if (feature.type === 'boolean') {
      if (typeof rawValue === 'boolean') return rawValue;
      if (rawValue === 'true') return true;
      if (rawValue === 'false') return false;
      throw new BadRequestException(`${feature.label} ka format sahi nahi hai.`);
    }

    if (feature.type === 'number') {
      const numeric = typeof rawValue === 'number' ? rawValue : Number(rawValue);
      if (!Number.isFinite(numeric)) {
        throw new BadRequestException(`${feature.label} numeric honi chahiye.`);
      }
      if (feature.min !== undefined && numeric < feature.min) {
        throw new BadRequestException(`${feature.label} minimum ${feature.min} honi chahiye.`);
      }
      if (feature.max !== undefined && numeric > feature.max) {
        throw new BadRequestException(`${feature.label} maximum ${feature.max} honi chahiye.`);
      }
      return numeric;
    }

    const text = String(rawValue).trim();
    if (!text) return undefined;
    if (feature.type === 'select' && feature.options && !feature.options.includes(text)) {
      throw new BadRequestException(`${feature.label} valid option se select karein.`);
    }
    return text;
  }

  private toListingAttributes(input: Prisma.JsonValue | null | undefined): ListingAttributes | undefined {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return undefined;
    }
    return input as ListingAttributes;
  }

  private buildChatMessagePayload(message?: string, imageUrl?: string) {
    const trimmedMessage = message?.trim() ?? '';
    const trimmedImage = imageUrl?.trim() ?? '';
    if (!trimmedMessage && !trimmedImage) return '';
    if (trimmedImage && trimmedMessage) return `[image]${trimmedImage}\n${trimmedMessage}`;
    if (trimmedImage) return `[image]${trimmedImage}`;
    return trimmedMessage;
  }

  private async notifySavedUsersOfUpdate(listingId: string, title: string) {
    const savedUsers = await this.prisma.savedAd.findMany({
      where: { listingId },
      select: { userId: true },
      take: 50,
    });

    await this.pushNotificationsService.notifyUsers(
      savedUsers.map((entry) => entry.userId),
      {
        title: 'Saved item update hui',
        body: `"${title}" ki price ya details update hui hain`,
        href: `/listings/${listingId}`,
        type: NotificationType.SAVED_UPDATE,
        data: { href: `/listings/${listingId}`, type: 'saved_update' },
      },
    );
  }

  private async notifyCategoryWatchers(listing: Listing & { category?: { name?: string } }) {
    const watchers = await this.prisma.user.findMany({
      where: {
        id: { not: listing.userId },
        OR: [
          {
            savedAds: {
              some: {
                listing: { categoryId: listing.categoryId },
              },
            },
          },
          {
            listings: {
              some: { categoryId: listing.categoryId },
            },
          },
        ],
      },
      select: { id: true },
      take: 50,
    });

    await this.pushNotificationsService.notifyUsers(
      watchers.map((entry) => entry.id),
      {
        title: 'Aapki pasand ki category me naya ad aaya',
        body: `"${listing.title}" ab live hai`,
        href: `/listings/${listing.id}`,
        type: NotificationType.NEW_LISTING,
        data: { href: `/listings/${listing.id}`, type: 'new_listing' },
      },
    );
  }

  private publicVisibilityWhere(): Prisma.ListingWhereInput {
    const now = Date.now();
    const soldCutoff = new Date(now - 24 * 60 * 60 * 1000);
    const expiryCutoff = new Date(now - 30 * 24 * 60 * 60 * 1000);

    return {
      createdAt: { gte: expiryCutoff },
      images: { isEmpty: false },
      OR: [
        { status: 'ACTIVE' },
        { status: 'PENDING' },
        { status: 'SOLD', updatedAt: { gte: soldCutoff } },
      ],
    };
  }

  private isPubliclyVisible(status: string, createdAt: Date, updatedAt: Date) {
    const expired = createdAt.getTime() < Date.now() - 30 * 24 * 60 * 60 * 1000;
    const soldExpired =
      status === 'SOLD' && updatedAt.getTime() < Date.now() - 24 * 60 * 60 * 1000;
    return !expired && status !== 'DELETED' && status !== 'INACTIVE' && !soldExpired;
  }
}
