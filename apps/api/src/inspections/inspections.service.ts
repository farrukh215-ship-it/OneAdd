import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InspectionRequestStatus,
  InspectionVerdict,
  ListingInspectionStatus,
  Prisma,
  User,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdminInspectionDecisionDto } from './dto/admin-inspection-decision.dto';
import { BookInspectionDto } from './dto/book-inspection.dto';
import { InspectionQueueDto } from './dto/inspection-queue.dto';
import { ManageWorkshopDto } from './dto/manage-workshop.dto';
import { PoliceVerifyDto } from './dto/police-verify.dto';
import { RequestInspectionDto } from './dto/request-inspection.dto';
import { SubmitInspectionReportDto } from './dto/submit-inspection-report.dto';
import { WorkshopVerifyDto } from './dto/workshop-verify.dto';

const LAHORE_WORKSHOPS = [
  {
    name: 'Johar Town Auto Lab',
    city: 'Lahore',
    address: 'Johar Town, Lahore',
    contact: '+92 300 1112233',
  },
  {
    name: 'Model Town Vehicle Check Center',
    city: 'Lahore',
    address: 'Model Town, Lahore',
    contact: '+92 300 2223344',
  },
  {
    name: 'DHA Car Doctor Workshop',
    city: 'Lahore',
    address: 'DHA Phase 4, Lahore',
    contact: '+92 300 3334455',
  },
  {
    name: 'Kalma Chowk Mechanical Hub',
    city: 'Lahore',
    address: 'Kalma Chowk, Lahore',
    contact: '+92 300 4445566',
  },
  {
    name: 'Thokar Niaz Baig Inspection Point',
    city: 'Lahore',
    address: 'Thokar Niaz Baig, Lahore',
    contact: '+92 300 5556677',
  },
];

const STATUS_TO_LISTING_STATUS: Record<InspectionRequestStatus, ListingInspectionStatus> = {
  REQUESTED: 'REQUESTED',
  BOOKED: 'BOOKED',
  WORKSHOP_VERIFIED: 'WORKSHOP_VERIFIED',
  POLICE_VERIFIED: 'POLICE_VERIFIED',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
};

@Injectable()
export class InspectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listWorkshops(city?: string) {
    await this.ensureSeedWorkshops();
    return this.prisma.workshopPartner.findMany({
      where: {
        active: true,
        ...(city ? { city: { equals: city, mode: 'insensitive' } } : {}),
      },
      orderBy: [{ city: 'asc' }, { name: 'asc' }],
    });
  }

  async adminListWorkshops(user: User) {
    this.ensureRole(user, ['ADMIN']);
    await this.ensureSeedWorkshops();
    return this.prisma.workshopPartner.findMany({
      orderBy: [{ city: 'asc' }, { name: 'asc' }],
    });
  }

  async adminCreateWorkshop(user: User, dto: ManageWorkshopDto) {
    this.ensureRole(user, ['ADMIN']);
    return this.prisma.workshopPartner.create({
      data: {
        name: dto.name.trim(),
        city: dto.city.trim(),
        address: dto.address.trim(),
        contact: dto.contact.trim(),
        active: dto.active ?? true,
      },
    });
  }

  async adminUpdateWorkshop(id: string, user: User, dto: ManageWorkshopDto) {
    this.ensureRole(user, ['ADMIN']);
    return this.prisma.workshopPartner.update({
      where: { id },
      data: {
        name: dto.name.trim(),
        city: dto.city.trim(),
        address: dto.address.trim(),
        contact: dto.contact.trim(),
        active: dto.active ?? true,
      },
    });
  }

  async createPendingVehicleInspectionForListing(input: {
    listingId: string;
    sellerId: string;
    workshopPartnerId: string;
    inspectionReportPdfUrl: string;
  }) {
    await this.ensureSeedWorkshops();
    const workshop = await this.prisma.workshopPartner.findUnique({
      where: { id: input.workshopPartnerId },
    });
    if (!workshop || !workshop.active) {
      throw new BadRequestException('Selected workshop available nahi hai.');
    }
    this.ensurePdfUrl(input.inspectionReportPdfUrl);

    const request = await this.prisma.inspectionRequest.create({
      data: {
        listingId: input.listingId,
        sellerId: input.sellerId,
        workshopPartnerId: input.workshopPartnerId,
        status: 'SUBMITTED',
        submittedAt: new Date(),
        offlinePaymentAcknowledged: true,
        report: {
          create: {
            vehicleInfo: {} as Prisma.InputJsonValue,
            ownerVerification: {} as Prisma.InputJsonValue,
            avlsVerification: {} as Prisma.InputJsonValue,
            mechanicalChecklist: {} as Prisma.InputJsonValue,
            bodyChecklist: {} as Prisma.InputJsonValue,
            interiorChecklist: {} as Prisma.InputJsonValue,
            tyreChecklist: {} as Prisma.InputJsonValue,
            evidencePhotos: [],
            formPageFrontUrl: input.inspectionReportPdfUrl,
            overallRating: 3,
            verdict: 'CAUTION',
            signatures: {
              sellerSubmitted: true,
            } as Prisma.InputJsonValue,
            stamps: {
              submissionMode: 'pdf-only-prelisting',
            } as Prisma.InputJsonValue,
          },
        },
      },
      include: this.inspectionInclude(),
    });

    await this.syncListingInspectionState(request.listingId, request.status);
    await this.logAction(request.id, 'PRELISTING_REPORT_SUBMITTED', undefined, undefined, {
      workshopPartnerId: input.workshopPartnerId,
      inspectionReportPdfUrl: input.inspectionReportPdfUrl,
    });
    return request;
  }

  async requestInspection(user: User, dto: RequestInspectionDto) {
    const listing = await this.getEligibleListing(dto.listingId);
    if (listing.userId !== user.id) {
      throw new ForbiddenException('Sirf listing owner inspection request kar sakta hai.');
    }

    const existing = await this.prisma.inspectionRequest.findFirst({
      where: {
        listingId: listing.id,
        status: {
          in: [
            'REQUESTED',
            'BOOKED',
            'WORKSHOP_VERIFIED',
            'POLICE_VERIFIED',
            'SUBMITTED',
            'APPROVED',
          ],
        },
      },
    });
    if (existing) {
      return this.getInspection(existing.id, user);
    }

    const request = await this.prisma.inspectionRequest.create({
      data: {
        listingId: listing.id,
        sellerId: user.id,
        status: 'REQUESTED',
      },
      include: this.inspectionInclude(),
    });

    await this.syncListingInspectionState(request.listingId, request.status);
    await this.logAction(request.id, 'REQUEST_CREATED', user, undefined, {
      listingId: listing.id,
    });
    return request;
  }

  async bookInspection(id: string, user: User, dto: BookInspectionDto) {
    const record = await this.ensureInspection(id);
    this.ensureSeller(record, user);
    this.ensureStatus(record.status, ['REQUESTED', 'REJECTED', 'EXPIRED']);

    const workshop = await this.prisma.workshopPartner.findUnique({
      where: { id: dto.workshopPartnerId },
    });
    if (!workshop || !workshop.active) {
      throw new BadRequestException('Selected workshop available nahi hai.');
    }

    const bookedDate = new Date(dto.bookedDate);
    if (Number.isNaN(bookedDate.getTime()) || bookedDate.getTime() <= Date.now()) {
      throw new BadRequestException('Booking date future date honi chahiye.');
    }
    if (!dto.offlinePaymentAcknowledged) {
      throw new BadRequestException('Offline fee acknowledgement required hai.');
    }

    const updated = await this.prisma.inspectionRequest.update({
      where: { id },
      data: {
        workshopPartnerId: dto.workshopPartnerId,
        bookedDate,
        offlinePaymentAcknowledged: dto.offlinePaymentAcknowledged,
        status: 'BOOKED',
      },
      include: this.inspectionInclude(),
    });

    await this.syncListingInspectionState(updated.listingId, updated.status);
    await this.logAction(updated.id, 'BOOKED', user, undefined, {
      workshopPartnerId: dto.workshopPartnerId,
      bookedDate: bookedDate.toISOString(),
      offlinePaymentAcknowledged: dto.offlinePaymentAcknowledged,
    });
    return updated;
  }

  async workshopVerify(id: string, user: User, dto: WorkshopVerifyDto) {
    this.ensureRole(user, ['WORKSHOP_MANAGER']);
    const record = await this.ensureInspection(id);
    this.ensureStatus(record.status, ['BOOKED']);

    const updated = await this.prisma.inspectionRequest.update({
      where: { id },
      data: {
        status: 'WORKSHOP_VERIFIED',
        workshopVerifiedById: user.id,
        report: {
          upsert: {
            create: this.emptyReportData(dto.inspectorName, dto.workshopNotes),
            update: {
              signatures: {
                ...(record.report?.signatures as Record<string, unknown> | undefined),
                inspectorName: dto.inspectorName ?? null,
              } as Prisma.InputJsonValue,
              stamps: {
                ...(record.report?.stamps as Record<string, unknown> | undefined),
                workshopNotes: dto.workshopNotes ?? null,
              } as Prisma.InputJsonValue,
            },
          },
        },
      },
      include: this.inspectionInclude(),
    });

    await this.syncListingInspectionState(updated.listingId, updated.status);
    await this.logAction(updated.id, 'WORKSHOP_VERIFIED', user, dto.workshopNotes, {
      inspectorName: dto.inspectorName ?? null,
    });
    return updated;
  }

  async policeVerify(id: string, user: User, dto: PoliceVerifyDto) {
    this.ensureRole(user, ['POLICE_OFFICER']);
    const record = await this.ensureInspection(id);
    this.ensureStatus(record.status, ['WORKSHOP_VERIFIED']);

    const avlsVerification = {
      isStolen: dto.isStolen,
      firStatus: dto.firStatus,
      avlsReferenceNo: dto.avlsReferenceNo,
      policeStation: dto.policeStation,
      officerName: dto.officerName ?? null,
      notes: dto.policeNotes ?? null,
    };

    const updated = await this.prisma.inspectionRequest.update({
      where: { id },
      data: {
        status: 'POLICE_VERIFIED',
        policeVerifiedById: user.id,
        report: {
          upsert: {
            create: {
              ...this.emptyReportData(),
              avlsVerification: avlsVerification as Prisma.InputJsonValue,
            },
            update: {
              avlsVerification: avlsVerification as Prisma.InputJsonValue,
            },
          },
        },
      },
      include: this.inspectionInclude(),
    });

    await this.syncListingInspectionState(updated.listingId, updated.status);
    await this.logAction(updated.id, 'POLICE_VERIFIED', user, dto.policeNotes, {
      avlsReferenceNo: dto.avlsReferenceNo,
      policeStation: dto.policeStation,
      isStolen: dto.isStolen,
      firStatus: dto.firStatus,
    });
    return updated;
  }

  async submitReport(id: string, user: User, dto: SubmitInspectionReportDto) {
    const record = await this.ensureInspection(id);
    const canSubmit =
      record.sellerId === user.id || user.role === 'WORKSHOP_MANAGER' || user.role === 'ADMIN';
    if (!canSubmit) {
      throw new ForbiddenException('Aap is inspection report ko submit nahi kar sakte.');
    }
    this.ensureStatus(record.status, ['POLICE_VERIFIED', 'SUBMITTED']);
    this.ensurePdfUrl(dto.formPageFrontUrl);

    const updated = await this.prisma.inspectionRequest.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        report: {
          upsert: {
            create: {
              vehicleInfo: dto.vehicleInfo as Prisma.InputJsonValue,
              ownerVerification: dto.ownerVerification as Prisma.InputJsonValue,
              avlsVerification: dto.avlsVerification as Prisma.InputJsonValue,
              mechanicalChecklist: dto.mechanicalChecklist as Prisma.InputJsonValue,
              bodyChecklist: dto.bodyChecklist as Prisma.InputJsonValue,
              interiorChecklist: dto.interiorChecklist as Prisma.InputJsonValue,
              tyreChecklist: dto.tyreChecklist as Prisma.InputJsonValue,
              evidencePhotos: dto.evidencePhotos,
              formPageFrontUrl: dto.formPageFrontUrl,
              formPageBackUrl: dto.formPageBackUrl,
              overallRating: dto.overallRating,
              verdict: dto.verdict as InspectionVerdict,
              signatures: dto.signatures as Prisma.InputJsonValue,
              stamps: dto.stamps as Prisma.InputJsonValue,
            },
            update: {
              vehicleInfo: dto.vehicleInfo as Prisma.InputJsonValue,
              ownerVerification: dto.ownerVerification as Prisma.InputJsonValue,
              avlsVerification: dto.avlsVerification as Prisma.InputJsonValue,
              mechanicalChecklist: dto.mechanicalChecklist as Prisma.InputJsonValue,
              bodyChecklist: dto.bodyChecklist as Prisma.InputJsonValue,
              interiorChecklist: dto.interiorChecklist as Prisma.InputJsonValue,
              tyreChecklist: dto.tyreChecklist as Prisma.InputJsonValue,
              evidencePhotos: dto.evidencePhotos,
              formPageFrontUrl: dto.formPageFrontUrl,
              formPageBackUrl: dto.formPageBackUrl,
              overallRating: dto.overallRating,
              verdict: dto.verdict as InspectionVerdict,
              signatures: dto.signatures as Prisma.InputJsonValue,
              stamps: dto.stamps as Prisma.InputJsonValue,
            },
          },
        },
      },
      include: this.inspectionInclude(),
    });

    await this.syncListingInspectionState(updated.listingId, updated.status);
    await this.logAction(updated.id, 'REPORT_SUBMITTED', user, undefined, {
      verdict: dto.verdict,
      overallRating: dto.overallRating,
      evidenceCount: dto.evidencePhotos.length,
      hasFrontForm: Boolean(dto.formPageFrontUrl),
      hasBackForm: Boolean(dto.formPageBackUrl),
    });
    return updated;
  }

  async adminApprove(id: string, user: User, dto: AdminInspectionDecisionDto) {
    this.ensureRole(user, ['ADMIN']);
    const record = await this.ensureInspection(id);
    this.ensureStatus(record.status, ['SUBMITTED']);

    const badgeLabel = dto.badgeLabel?.trim() || 'TGMG Inspected';
    const approvedAt = new Date();
    const updated = await this.prisma.inspectionRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt,
        adminReviewedById: user.id,
        rejectionNote: null,
      },
      include: this.inspectionInclude(),
    });

    await this.prisma.listing.update({
      where: { id: updated.listingId },
      data: {
        status: 'ACTIVE',
        inspectionStatus: 'APPROVED',
        isInspectionApproved: true,
        inspectionApprovedAt: approvedAt,
        inspectionBadgeLabel: badgeLabel,
      },
    });

    await this.logAction(updated.id, 'ADMIN_APPROVED', user, dto.note, {
      badgeLabel,
    });
    return updated;
  }

  async adminReject(id: string, user: User, dto: AdminInspectionDecisionDto) {
    this.ensureRole(user, ['ADMIN']);
    const record = await this.ensureInspection(id);
    this.ensureStatus(record.status, ['SUBMITTED', 'POLICE_VERIFIED', 'WORKSHOP_VERIFIED']);

    const updated = await this.prisma.inspectionRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        adminReviewedById: user.id,
        rejectionNote: dto.note?.trim() || 'Admin rejection',
      },
      include: this.inspectionInclude(),
    });
    await this.prisma.listing.update({
      where: { id: updated.listingId },
      data: {
        status: 'PENDING',
        inspectionStatus: 'REJECTED',
        isInspectionApproved: false,
        inspectionApprovedAt: null,
      },
    });
    await this.logAction(updated.id, 'ADMIN_REJECTED', user, dto.note);
    return updated;
  }

  async getInspection(id: string, user?: User) {
    const record = await this.ensureInspection(id);
    if (!user) return record;

    const allowed =
      user.role === 'ADMIN' ||
      user.role === 'WORKSHOP_MANAGER' ||
      user.role === 'POLICE_OFFICER' ||
      record.sellerId === user.id;
    if (!allowed) {
      throw new ForbiddenException('Aap is inspection ko access nahi kar sakte.');
    }
    return record;
  }

  async getInspectionByListing(listingId: string, user?: User) {
    const record = await this.prisma.inspectionRequest.findFirst({
      where: {
        listingId,
        status: {
          in: ['REQUESTED', 'BOOKED', 'WORKSHOP_VERIFIED', 'POLICE_VERIFIED', 'SUBMITTED', 'APPROVED'],
        },
      },
      include: this.inspectionInclude(),
      orderBy: { createdAt: 'desc' },
    });
    if (!record) return null;

    if (!user) {
      if (record.status !== 'APPROVED') return null;
      return record;
    }
    return this.getInspection(record.id, user);
  }

  async adminQueue(user: User, query: InspectionQueueDto) {
    this.ensureRole(user, ['ADMIN']);

    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(query.limit || 20)));

    const where: Prisma.InspectionRequestWhereInput = {
      ...(query.city
        ? { listing: { city: { equals: query.city, mode: 'insensitive' } } }
        : {}),
      ...(query.workshopPartnerId ? { workshopPartnerId: query.workshopPartnerId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [data, total, grouped] = await Promise.all([
      this.prisma.inspectionRequest.findMany({
        where,
        include: this.inspectionInclude(),
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.inspectionRequest.count({ where }),
      this.prisma.inspectionRequest.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    const summary = grouped.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = item._count._all;
      return acc;
    }, {});

    return {
      data,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      summary,
    };
  }

  async expireStaleRequests() {
    const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000);
    const stale = await this.prisma.inspectionRequest.findMany({
      where: {
        status: { in: ['REQUESTED', 'BOOKED'] },
        updatedAt: { lt: cutoff },
      },
      select: { id: true, listingId: true },
    });
    if (!stale.length) return { expired: 0 };

    await this.prisma.inspectionRequest.updateMany({
      where: { id: { in: stale.map((item) => item.id) } },
      data: { status: 'EXPIRED' },
    });
    await Promise.all(
      stale.map((item) => this.syncListingInspectionState(item.listingId, 'EXPIRED')),
    );
    await Promise.all(
      stale.map((item) =>
        this.logAction(item.id, 'EXPIRED_BY_CRON', undefined, 'Auto expiry after 72 hours'),
      ),
    );
    return { expired: stale.length };
  }

  private async ensureSeedWorkshops() {
    const count = await this.prisma.workshopPartner.count();
    if (count > 0) return;

    await this.prisma.workshopPartner.createMany({
      data: LAHORE_WORKSHOPS,
      skipDuplicates: true,
    });
  }

  private inspectionInclude() {
    return {
      listing: {
        select: {
          id: true,
          title: true,
          city: true,
          category: { select: { slug: true, name: true } },
          subcategorySlug: true,
          subcategoryName: true,
          inspectionStatus: true,
          isInspectionApproved: true,
          inspectionApprovedAt: true,
          inspectionBadgeLabel: true,
        },
      },
      seller: {
        select: {
          id: true,
          name: true,
          phone: true,
          role: true,
        },
      },
      workshopPartner: true,
      workshopVerifiedBy: { select: { id: true, name: true, role: true } },
      policeVerifiedBy: { select: { id: true, name: true, role: true } },
      adminReviewedBy: { select: { id: true, name: true, role: true } },
      report: true,
      auditLogs: {
        orderBy: { createdAt: 'desc' },
        take: 25,
      },
    } as const;
  }

  private async ensureInspection(id: string) {
    const record = await this.prisma.inspectionRequest.findUnique({
      where: { id },
      include: this.inspectionInclude(),
    });
    if (!record) throw new NotFoundException('Inspection request nahi mili.');
    return record;
  }

  private ensureSeller(record: { sellerId: string }, user: User) {
    if (record.sellerId !== user.id) {
      throw new ForbiddenException('Sirf listing owner is action ko perform kar sakta hai.');
    }
  }

  private ensureRole(user: User, roles: UserRole[]) {
    if (!roles.includes(user.role)) {
      throw new ForbiddenException('Aapke paas is action ki permission nahi hai.');
    }
  }

  private ensureStatus(current: InspectionRequestStatus, allowed: InspectionRequestStatus[]) {
    if (!allowed.includes(current)) {
      throw new BadRequestException(`Current status ${current} me ye action allow nahi hai.`);
    }
  }

  private async getEligibleListing(listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { category: true },
    });
    if (!listing) {
      throw new NotFoundException('Listing nahi mili.');
    }
    if (listing.status === 'DELETED' || listing.status === 'INACTIVE') {
      throw new BadRequestException('Inactive listing par inspection request nahi ho sakti.');
    }

    const isEligibleCategory =
      listing.category.slug === 'cars' || listing.category.slug === 'motorcycles';
    if (!isEligibleCategory) {
      throw new BadRequestException(
        'Inspection sirf Cars ya Motorcycles listings ke liye available hai.',
      );
    }
    return listing;
  }

  private emptyReportData(inspectorName?: string, workshopNotes?: string) {
    return {
      vehicleInfo: {} as Prisma.InputJsonValue,
      ownerVerification: {} as Prisma.InputJsonValue,
      avlsVerification: {} as Prisma.InputJsonValue,
      mechanicalChecklist: {} as Prisma.InputJsonValue,
      bodyChecklist: {} as Prisma.InputJsonValue,
      interiorChecklist: {} as Prisma.InputJsonValue,
      tyreChecklist: {} as Prisma.InputJsonValue,
      evidencePhotos: [],
      signatures: { inspectorName: inspectorName ?? null } as Prisma.InputJsonValue,
      stamps: { workshopNotes: workshopNotes ?? null } as Prisma.InputJsonValue,
    };
  }

  private ensurePdfUrl(url?: string | null) {
    const value = url?.trim();
    if (!value) {
      throw new BadRequestException('Inspection form PDF required hai.');
    }
    if (!/\.pdf(\?|$)/i.test(value)) {
      throw new BadRequestException('Sirf readable PDF form submit kiya ja sakta hai.');
    }
  }

  private async syncListingInspectionState(
    listingId: string,
    status: InspectionRequestStatus,
  ) {
    const listingStatus = STATUS_TO_LISTING_STATUS[status];
    await this.prisma.listing.update({
      where: { id: listingId },
      data: {
        inspectionStatus: listingStatus,
        isInspectionApproved: status === 'APPROVED',
        inspectionApprovedAt: status === 'APPROVED' ? new Date() : null,
      },
    });
  }

  private async logAction(
    inspectionRequestId: string,
    action: string,
    actor?: Pick<User, 'id' | 'role'>,
    note?: string,
    payload?: Prisma.InputJsonValue,
  ) {
    await this.prisma.inspectionAuditLog.create({
      data: {
        inspectionRequestId,
        actorUserId: actor?.id ?? null,
        actorRole: actor?.role ?? null,
        action,
        note: note ?? null,
        payload: payload ?? undefined,
      },
    });
  }
}
