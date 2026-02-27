import { Injectable, NotFoundException } from "@nestjs/common";
import { ListingStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  getCategories() {
    return this.prisma.category.findMany({
      orderBy: [{ depth: "asc" }, { name: "asc" }]
    });
  }

  async createCategory(
    adminId: string,
    payload: { name: string; slug: string; parentId?: string }
  ) {
    const created = await this.prisma.category.create({
      data: {
        name: payload.name.trim(),
        slug: payload.slug.trim().toLowerCase(),
        parentId: payload.parentId ?? null
      }
    });
    await this.createAuditLog(adminId, "CREATE_CATEGORY", "OTHER", created.id, {
      name: created.name,
      slug: created.slug
    });
    return created;
  }

  async updateCategory(
    adminId: string,
    categoryId: string,
    payload: { name: string; slug: string; parentId?: string }
  ) {
    const existing = await this.prisma.category.findUnique({
      where: { id: categoryId }
    });
    if (!existing) {
      throw new NotFoundException("Category not found.");
    }

    const updated = await this.prisma.category.update({
      where: { id: categoryId },
      data: {
        name: payload.name.trim(),
        slug: payload.slug.trim().toLowerCase(),
        parentId: payload.parentId ?? null
      }
    });

    await this.createAuditLog(adminId, "UPDATE_CATEGORY", "OTHER", categoryId, {
      name: updated.name,
      slug: updated.slug
    });

    return updated;
  }

  getListings(status?: ListingStatus) {
    return this.prisma.listing.findMany({
      where: status ? { status } : undefined,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            isBlocked: true,
            shadowBanned: true
          }
        },
        category: {
          select: { id: true, name: true, slug: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  getUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        cnic: true,
        isBlocked: true,
        shadowBanned: true,
        createdAt: true,
        trustScore: { select: { score: true } }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  getAuditLogs(limit = 100) {
    return this.prisma.auditLog.findMany({
      include: {
        admin: { select: { id: true, fullName: true, email: true } }
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit, 1), 500)
    });
  }

  async createFeatureFlagAuditLog(
    adminId: string,
    key: string,
    enabled: boolean
  ) {
    await this.createAuditLog(adminId, "TOGGLE_FEATURE_FLAG", "FEATURE_FLAG", key, {
      enabled
    });
  }

  private async createAuditLog(
    adminId: string,
    action: string,
    targetType: "USER" | "LISTING" | "CHAT_THREAD" | "REPORT" | "FEATURE_FLAG" | "TRUST_SCORE" | "OTHER",
    targetId: string,
    metadata?: Record<string, unknown>
  ) {
    await this.prisma.auditLog.create({
      data: {
        adminId,
        action,
        targetType,
        targetId,
        metadata: (metadata ?? {}) as Prisma.InputJsonValue
      }
    });
  }
}
