import {
  Category,
  ContactLog,
  Listing,
  Prisma,
  SavedAd,
} from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ListingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  countActiveByUserAndCategory(userId: string, categoryId: string) {
    return this.prisma.listing.count({
      where: { userId, categoryId, status: 'ACTIVE' },
    });
  }

  create(data: Prisma.ListingUncheckedCreateInput) {
    return this.prisma.listing.create({
      data,
      include: {
        category: true,
        user: {
          select: { id: true, name: true, city: true, verified: true },
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

  findCategoryBySlug(slug: string): Promise<Category | null> {
    return this.prisma.category.findUnique({ where: { slug } });
  }
}
