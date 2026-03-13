import {
  Category,
  Condition,
  ContactLog,
  Listing,
  ListingMessage,
  ListingThread,
  Offer,
  Prisma,
  SavedAd,
  StoreType,
} from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ListingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly sellerSelect = {
    id: true,
    name: true,
    city: true,
    area: true,
    verified: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  countActiveByUserAndCategory(userId: string, categoryId: string) {
    return this.prisma.listing.count({
      where: { userId, categoryId, status: { in: ['ACTIVE', 'PENDING'] } },
    });
  }

  create(data: Prisma.ListingUncheckedCreateInput) {
    return this.prisma.listing.create({
      data,
      include: {
        category: true,
        user: {
          select: this.sellerSelect,
        },
      },
    });
  }

  findMany<T extends Prisma.ListingFindManyArgs>(args: Prisma.SelectSubset<T, Prisma.ListingFindManyArgs>) {
    return this.prisma.listing.findMany(args);
  }

  count(args: Prisma.ListingCountArgs) {
    return this.prisma.listing.count(args);
  }

  findUnique<T extends Prisma.ListingFindUniqueArgs>(args: Prisma.SelectSubset<T, Prisma.ListingFindUniqueArgs>) {
    return this.prisma.listing.findUnique(args);
  }

  update<T extends Prisma.ListingUpdateArgs>(args: Prisma.SelectSubset<T, Prisma.ListingUpdateArgs>) {
    return this.prisma.listing.update(args);
  }

  createContactLog(data: Prisma.ContactLogUncheckedCreateInput): Promise<ContactLog> {
    return this.prisma.contactLog.create({ data });
  }

  upsertSavedAd(userId: string, listingId: string): Promise<SavedAd> {
    return this.prisma.savedAd.upsert({
      where: { userId_listingId: { userId, listingId } },
      update: {},
      create: { userId, listingId },
    });
  }

  deleteSavedAd(userId: string, listingId: string) {
    return this.prisma.savedAd.delete({
      where: { userId_listingId: { userId, listingId } },
    });
  }

  findCategoryById(id: string): Promise<Category | null> {
    return this.prisma.category.findUnique({ where: { id } });
  }

  findCategoryBySlug(slug: string): Promise<Category | null> {
    return this.prisma.category.findUnique({ where: { slug } });
  }

  findCategoryManyBySlug(slugs: string[]) {
    return this.prisma.category.findMany({
      where: { slug: { in: slugs } },
      select: { id: true, slug: true, name: true },
    });
  }

  findOrCreateThread(listingId: string): Promise<ListingThread> {
    return this.prisma.listingThread.upsert({
      where: { listingId },
      update: {},
      create: { listingId },
    });
  }

  getThreadWithMessages(listingId: string) {
    return this.prisma.listingThread.findUnique({
      where: { listingId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: this.sellerSelect },
          },
        },
      },
    });
  }

  createThreadMessage(data: Prisma.ListingMessageUncheckedCreateInput): Promise<ListingMessage> {
    return this.prisma.listingMessage.create({
      data,
      include: {
        user: { select: this.sellerSelect },
      },
    });
  }

  createOffer(data: Prisma.OfferUncheckedCreateInput): Promise<Offer> {
    return this.prisma.offer.create({
      data,
      include: {
        user: { select: this.sellerSelect },
      },
    });
  }

  findOffersForListing(listingId: string): Promise<(Offer & { user: { id: string; name: string | null; city: string | null; area: string | null; verified: boolean; createdAt: Date; updatedAt: Date } })[]> {
    return this.prisma.offer.findMany({
      where: { listingId },
      orderBy: [{ amount: 'asc' }, { createdAt: 'asc' }],
      include: {
        user: { select: this.sellerSelect },
      },
    });
  }

  async findSuggestions(query: string, limit = 8): Promise<Array<{ label: string; categorySlug: string | null; categoryName: string | null; city: string | null }>> {
    const q = query.trim();
    if (!q) return [];

    const rows = await this.prisma.$queryRaw<Array<{ label: string; category_slug: string | null; category_name: string | null; city: string | null }>>`
      SELECT DISTINCT
        l.title AS label,
        c.slug AS category_slug,
        c.name AS category_name,
        l.city AS city
      FROM "Listing" l
      LEFT JOIN "Category" c ON c.id = l."categoryId"
      WHERE l.status = 'ACTIVE'
        AND l."isStore" = false
        AND (
          similarity(lower(l.title), lower(${q})) > 0.15
          OR lower(l.title) ILIKE ${`%${q.toLowerCase()}%`}
          OR lower(coalesce(c.name, '')) ILIKE ${`%${q.toLowerCase()}%`}
          OR to_tsvector('simple', coalesce(l.title, '') || ' ' || coalesce(l.description, ''))
             @@ plainto_tsquery('simple', ${q})
        )
      ORDER BY
        similarity(lower(l.title), lower(${q})) DESC,
        l."createdAt" DESC
      LIMIT ${limit};
    `;

    return rows.map((row) => ({
      label: row.label,
      categorySlug: row.category_slug,
      categoryName: row.category_name,
      city: row.city,
    }));
  }

  async findPopularSuggestions(limit = 6): Promise<Array<{ label: string; categorySlug: string | null; categoryName: string | null; city: string | null }>> {
    const rows = await this.prisma.$queryRaw<Array<{ label: string; category_slug: string | null; category_name: string | null; city: string | null }>>`
      SELECT
        c.name AS label,
        c.slug AS category_slug,
        c.name AS category_name,
        NULL::text AS city
      FROM "Category" c
      JOIN "Listing" l ON l."categoryId" = c.id
      WHERE l.status = 'ACTIVE'
        AND l."isStore" = false
        AND l."createdAt" >= NOW() - interval '30 days'
      GROUP BY c.id, c.name, c.slug
      ORDER BY COUNT(l.id) DESC, MAX(l."createdAt") DESC
      LIMIT ${limit};
    `;

    return rows.map((row) => ({
      label: row.label,
      categorySlug: row.category_slug,
      categoryName: row.category_name,
      city: row.city,
    }));
  }

  async searchListingIds(params: {
    q: string;
    category?: string;
    city?: string;
    condition?: Condition;
    isStore: boolean;
    storeType?: StoreType;
    minPrice?: number;
    maxPrice?: number;
    limit: number;
    offset: number;
  }): Promise<string[]> {
    const values: Array<string | number> = [params.q];
    const whereClauses: string[] = [
      "((l.status = 'ACTIVE' OR l.status = 'PENDING') OR (l.status = 'SOLD' AND l.\"updatedAt\" >= NOW() - interval '1 day'))",
      `l."createdAt" >= NOW() - interval '30 days'`,
    ];

    values.push(params.isStore ? 1 : 0);
    whereClauses.push(`l."isStore" = ($${values.length} = 1)`);

    if (params.category) {
      values.push(params.category);
      whereClauses.push(`c.slug = $${values.length}`);
    }

    if (params.city) {
      values.push(params.city);
      whereClauses.push(`lower(l.city) = lower($${values.length})`);
    }

    if (params.condition) {
      values.push(params.condition);
      whereClauses.push(`l.condition = $${values.length}::"Condition"`);
    }

    if (params.storeType) {
      values.push(params.storeType);
      whereClauses.push(`l."storeType" = $${values.length}::"StoreType"`);
    }

    if (typeof params.minPrice === 'number') {
      values.push(params.minPrice);
      whereClauses.push(`l.price >= $${values.length}`);
    }

    if (typeof params.maxPrice === 'number') {
      values.push(params.maxPrice);
      whereClauses.push(`l.price <= $${values.length}`);
    }

    values.push(params.limit);
    const limitPlaceholder = `$${values.length}`;
    values.push(params.offset);
    const offsetPlaceholder = `$${values.length}`;

    const query = `
      SELECT l.id
      FROM "Listing" l
      LEFT JOIN "Category" c ON c.id = l."categoryId"
      WHERE ${whereClauses.join(' AND ')}
        AND (
          similarity(lower(l.title), lower($1)) > 0.1
          OR lower(l.title) ILIKE '%' || lower($1) || '%'
          OR lower(l.description) ILIKE '%' || lower($1) || '%'
          OR lower(coalesce(c.name, '')) ILIKE '%' || lower($1) || '%'
          OR to_tsvector('simple', coalesce(l.title, '') || ' ' || coalesce(l.description, ''))
             @@ plainto_tsquery('simple', $1)
        )
      ORDER BY
        (
          similarity(lower(l.title), lower($1)) * 1.5
          + similarity(lower(coalesce(l.description, '')), lower($1))
        ) DESC,
        l."createdAt" DESC
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
    `;

    const rows = await this.prisma.$queryRawUnsafe<Array<{ id: string }>>(query, ...values);
    return rows.map((row) => row.id);
  }
}
