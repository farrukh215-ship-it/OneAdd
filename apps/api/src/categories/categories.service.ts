import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    const expiryCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const soldCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.prisma.category.findMany({
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        _count: {
          select: {
            listings: {
              where: {
                createdAt: { gte: expiryCutoff },
                OR: [
                  { status: 'ACTIVE' },
                  { status: 'PENDING' },
                  { status: 'SOLD', updatedAt: { gte: soldCutoff } },
                ],
              },
            },
          },
        },
      },
    });
  }
}
