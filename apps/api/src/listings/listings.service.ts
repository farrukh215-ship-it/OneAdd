import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Condition, Listing, Prisma, StoreType, User } from '@prisma/client';
import Redis from 'ioredis';
import { PaginatedResponse } from '@tgmg/types';
import { ListingsRepository } from './listings.repository';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingFilterDto } from './dto/listing-filter.dto';
import { CreateListingMessageDto } from './dto/create-listing-message.dto';
import { CreateOfferDto } from './dto/create-offer.dto';

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

  constructor(private readonly listingsRepository: ListingsRepository) {
    this.redis = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379', {
      maxRetriesPerRequest: 1,
    });
  }

  async create(userId: string, dto: CreateListingDto) {
    const resolvedCategoryId = await this.resolveCategoryId(dto.categoryId);
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

    return this.listingsRepository.create({
      userId,
      title: dto.title,
      description: dto.description,
      price: dto.price,
      categoryId: resolvedCategoryId,
      images: dto.images,
      videos: dto.videos ?? [],
      condition: dto.condition,
      isStore,
      storeType: isStore ? dto.storeType : null,
      city: dto.city,
      area: dto.area,
      lat: dto.lat,
      lng: dto.lng,
    });
  }

  async findAll(
    filter: ListingFilterDto,
  ): Promise<PaginatedResponse<Listing & { category: unknown; user: unknown }>> {
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
      status: 'ACTIVE',
      isStore,
      ...(filter.city ? { city: filter.city } : {}),
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

  async featured() {
    return this.listingsRepository.findMany({
      where: { status: 'ACTIVE', isStore: false },
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

    if (!listing || listing.status === 'DELETED') {
      throw new NotFoundException('Listing not found');
    }

    const count = await this.redis.incr(`views:${id}`);

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

    return { phone: listing.user.phone };
  }

  async updateListing(id: string, currentUser: User, dto: UpdateListingDto) {
    const listing = await this.listingsRepository.findUnique({
      where: { id },
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
    const resolvedCategoryId = dto.categoryId
      ? await this.resolveCategoryId(dto.categoryId)
      : undefined;
    if (nextIsStore && !nextStoreType) {
      throw new BadRequestException('Dukaan ad ke liye store type select karein.');
    }

    return this.listingsRepository.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.images !== undefined ? { images: dto.images } : {}),
        ...(dto.videos !== undefined ? { videos: dto.videos } : {}),
        ...(dto.condition !== undefined ? { condition: dto.condition } : {}),
        ...((dto.isStore !== undefined || dto.storeType !== undefined)
          ? { isStore: nextIsStore, storeType: nextStoreType }
          : {}),
        ...(resolvedCategoryId !== undefined
          ? { category: { connect: { id: resolvedCategoryId } } }
          : {}),
        ...(dto.city !== undefined ? { city: dto.city } : {}),
        ...(dto.area !== undefined ? { area: dto.area } : {}),
        ...(dto.lat !== undefined ? { lat: dto.lat } : {}),
        ...(dto.lng !== undefined ? { lng: dto.lng } : {}),
      },
      include: {
        category: true,
        user: {
          select: this.sellerSelect,
        },
      },
    });
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
        status: 'ACTIVE',
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
    return this.listingsRepository.createThreadMessage({
      threadId: thread.id,
      userId: currentUser.id,
      message: dto.message.trim(),
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

  private async resolveCategoryId(input: string) {
    const direct = await this.listingsRepository.findCategoryById(input);
    if (direct) return direct.id;

    const bySlug = await this.listingsRepository.findCategoryBySlug(input);
    if (bySlug) return bySlug.id;

    throw new BadRequestException('Selected category valid nahi hai. Dobara category choose karein.');
  }
}
