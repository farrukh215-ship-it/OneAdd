import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Listing, Prisma, User } from '@prisma/client';
import Redis from 'ioredis';
import { PaginatedResponse } from '@tgmg/types';
import { ListingsRepository } from './listings.repository';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingFilterDto } from './dto/listing-filter.dto';

@Injectable()
export class ListingsService {
  private readonly redis: Redis;

  constructor(private readonly listingsRepository: ListingsRepository) {
    this.redis = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379', {
      maxRetriesPerRequest: 1,
    });
  }

  async create(userId: string, dto: CreateListingDto) {
    const existing = await this.listingsRepository.findActiveByUserAndCategory(
      userId,
      dto.categoryId,
    );

    if (existing) {
      throw new ConflictException(
        'Aap is category mein pehle se ek ad post kar chuke hain. Ek banda, ek ad.',
      );
    }

    return this.listingsRepository.create({
      userId,
      title: dto.title,
      description: dto.description,
      price: dto.price,
      categoryId: dto.categoryId,
      images: dto.images,
      condition: dto.condition,
      city: dto.city,
      area: dto.area,
    });
  }

  async findAll(
    filter: ListingFilterDto,
  ): Promise<PaginatedResponse<Listing & { category: unknown; user: unknown }>> {
    const where: Prisma.ListingWhereInput = {
      status: 'ACTIVE',
      ...(filter.city ? { city: filter.city } : {}),
      ...(filter.condition ? { condition: filter.condition } : {}),
      ...(typeof filter.minPrice === 'number' || typeof filter.maxPrice === 'number'
        ? {
            price: {
              ...(typeof filter.minPrice === 'number' ? { gte: filter.minPrice } : {}),
              ...(typeof filter.maxPrice === 'number' ? { lte: filter.maxPrice } : {}),
            },
          }
        : {}),
      ...(filter.category ? { category: { slug: filter.category } } : {}),
    };

    const orderBy =
      filter.sort === 'price_asc'
        ? ({ price: 'asc' } as const)
        : filter.sort === 'price_desc'
          ? ({ price: 'desc' } as const)
          : ({ createdAt: 'desc' } as const);

    const [data, total] = await Promise.all([
      this.listingsRepository.findMany({
        where,
        orderBy,
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
        include: {
          category: true,
          user: {
            select: { id: true, name: true, city: true, verified: true },
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

  async featured() {
    return this.listingsRepository.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        category: true,
        user: {
          select: { id: true, name: true, city: true, verified: true },
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
          select: { id: true, name: true, city: true, verified: true },
        },
      },
    });

    if (!listing || listing.status !== 'ACTIVE') {
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

    if (dto.categoryId || dto.city) {
      throw new BadRequestException('categoryId aur city update nahi ki ja sakti');
    }

    return this.listingsRepository.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.images !== undefined ? { images: dto.images } : {}),
        ...(dto.condition !== undefined ? { condition: dto.condition } : {}),
        ...(dto.area !== undefined ? { area: dto.area } : {}),
      },
      include: {
        category: true,
        user: {
          select: { id: true, name: true, city: true, verified: true },
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
            select: { id: true, name: true, city: true, verified: true },
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
          select: { id: true, name: true, city: true, verified: true },
        },
      },
    });

    return savedAds;
  }

  private async ensureListingExists(id: string) {
    const listing = await this.listingsRepository.findUnique({ where: { id } });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
  }
}
