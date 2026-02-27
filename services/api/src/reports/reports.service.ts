import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ListingStatus, Prisma, ReportStatus } from "@prisma/client";
import { FeatureFlagService } from "../feature-flags/feature-flag.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { TrustScoreService } from "../trust-score/trust-score.service";
import { CreateReportDto } from "./dto/create-report.dto";

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trustScoreService: TrustScoreService,
    private readonly featureFlagService: FeatureFlagService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService
  ) {}

  async createReport(reporterId: string, dto: CreateReportDto) {
    const targets = [dto.targetUserId, dto.targetListingId, dto.targetThreadId].filter(
      Boolean
    );
    if (targets.length !== 1) {
      throw new BadRequestException(
        "Exactly one target is required: targetUserId OR targetListingId OR targetThreadId."
      );
    }

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        targetUserId: dto.targetUserId ?? null,
        targetListingId: dto.targetListingId ?? null,
        targetThreadId: dto.targetThreadId ?? null,
        reason: dto.reason.trim()
      }
    });

    if (report.targetListingId) {
      await this.applyAutoHideIfThresholdReached(report.targetListingId);
    }

    await this.trustScoreService.recalculateForUser(reporterId);
    return report;
  }

  async getReportsQueue() {
    return this.prisma.report.findMany({
      where: {
        status: { in: [ReportStatus.OPEN, ReportStatus.IN_REVIEW] }
      },
      include: {
        reporter: { select: { id: true, fullName: true, email: true } },
        targetUser: { select: { id: true, fullName: true, email: true } },
        targetListing: { select: { id: true, title: true, status: true } },
        targetThread: { select: { id: true, status: true } }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async applyReportAction(adminId: string, reportId: string, status: ReportStatus) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        reporterId: true,
        targetUserId: true,
        targetListingId: true
      }
    });

    if (!report) {
      throw new NotFoundException("Report not found.");
    }

    const updated = await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status,
        resolvedAt:
          status === ReportStatus.RESOLVED || status === ReportStatus.REJECTED
            ? new Date()
            : null
      }
    });

    if (updated.targetListingId) {
      await this.applyAutoHideIfThresholdReached(updated.targetListingId);
    }

    await this.trustScoreService.recalculateForUser(report.reporterId);
    if (report.targetUserId) {
      await this.trustScoreService.recalculateForUser(report.targetUserId);
    }

    await this.createAuditLog(adminId, "REPORT_ACTION", "REPORT", reportId, {
      status
    });

    return updated;
  }

  async suspendUser(adminId: string, userId: string, enabled: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found.");
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isBlocked: enabled }
    });

    await this.createAuditLog(adminId, "SUSPEND_USER", "USER", userId, {
      enabled
    });
    return updated;
  }

  async shadowBanUser(adminId: string, userId: string, enabled: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found.");
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { shadowBanned: enabled }
    });

    await this.createAuditLog(adminId, "SHADOW_BAN_USER", "USER", userId, {
      enabled
    });
    return updated;
  }

  async deactivateListingByAdmin(adminId: string, listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, status: true, userId: true }
    });
    if (!listing) {
      throw new NotFoundException("Listing not found.");
    }
    if (listing.status !== ListingStatus.ACTIVE) {
      throw new BadRequestException("Only active listings can be deactivated.");
    }

    const buyers = await this.prisma.chatThread.findMany({
      where: { listingId },
      select: { buyerId: true }
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.listing.update({
        where: { id: listingId },
        data: {
          status: ListingStatus.PAUSED,
          rankingScore: 0
        }
      });

      await tx.userCategoryActiveListing.deleteMany({
        where: { listingId }
      });

      await tx.chatThread.updateMany({
        where: { listingId, status: "OPEN" },
        data: { status: "CLOSED", closedAt: new Date() }
      });

      return result;
    });

    await this.notificationsService.notifyUsers(
      [listing.userId, ...buyers.map((item) => item.buyerId)],
      "LISTING_DEACTIVATED",
      "Listing deactivated",
      "A listing was deactivated by moderation.",
      { listingId, reason: "admin_action" }
    );

    await this.createAuditLog(adminId, "DEACTIVATE_LISTING", "LISTING", listingId, {
      reason: "admin_action"
    });

    return updated;
  }

  private async applyAutoHideIfThresholdReached(listingId: string) {
    const autoHideEnabled = await this.featureFlagService.isEnabled(
      "AUTO_HIDE_REPORTS"
    );
    if (!autoHideEnabled) {
      return;
    }

    const threshold = this.configService.get<number>(
      "AUTO_HIDE_REPORTS_THRESHOLD",
      5
    );
    const reportCount = await this.prisma.report.count({
      where: {
        targetListingId: listingId,
        status: { in: [ReportStatus.OPEN, ReportStatus.IN_REVIEW, ReportStatus.RESOLVED] }
      }
    });

    if (reportCount < threshold) {
      return;
    }

    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, userId: true, status: true }
    });
    if (!listing || listing.status !== ListingStatus.ACTIVE) {
      return;
    }

    const buyers = await this.prisma.chatThread.findMany({
      where: { listingId },
      select: { buyerId: true }
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.listing.update({
        where: { id: listingId },
        data: {
          status: ListingStatus.PAUSED,
          rankingScore: 0
        }
      });

      await tx.userCategoryActiveListing.deleteMany({
        where: { listingId }
      });

      await tx.chatThread.updateMany({
        where: { listingId, status: "OPEN" },
        data: { status: "CLOSED", closedAt: new Date() }
      });
    });

    await this.notificationsService.notifyUsers(
      [listing.userId, ...buyers.map((item) => item.buyerId)],
      "LISTING_DEACTIVATED",
      "Listing deactivated",
      "A listing was auto-hidden due to reports.",
      { listingId, reason: "auto_hide_reports", reportCount, threshold }
    );
  }

  private async createAuditLog(
    adminId: string,
    action: string,
    targetType: "USER" | "LISTING" | "REPORT",
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
