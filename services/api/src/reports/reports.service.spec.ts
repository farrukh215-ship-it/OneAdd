import { ListingStatus, ReportStatus } from "@prisma/client";
import { ReportsService } from "./reports.service";

describe("ReportsService", () => {
  const trustScoreServiceMock = {
    recalculateForUser: jest.fn().mockResolvedValue(undefined)
  };
  const notificationsServiceMock = {
    notifyUsers: jest.fn().mockResolvedValue(undefined)
  };
  const featureFlagServiceMock = {
    isEnabled: jest.fn().mockResolvedValue(true)
  };
  const configServiceMock = {
    get: jest.fn((key: string, fallback?: unknown) => {
      if (key === "AUTO_HIDE_REPORTS_THRESHOLD") {
        return 2;
      }
      return fallback;
    })
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("auto-hides listing when report threshold is reached", async () => {
    const prisma: any = {
      report: {
        create: jest.fn().mockResolvedValue({
          id: "report-1",
          targetListingId: "listing-1"
        }),
        count: jest.fn().mockResolvedValue(2)
      },
      listing: {
        findUnique: jest.fn().mockResolvedValue({
          id: "listing-1",
          userId: "seller-1",
          status: ListingStatus.ACTIVE
        })
      },
      chatThread: {
        findMany: jest.fn().mockResolvedValue([{ buyerId: "buyer-1" }]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 })
      },
      userCategoryActiveListing: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 })
      },
      $transaction: jest.fn(async (fn: (txArg: any) => unknown) =>
        fn({
          listing: { update: jest.fn().mockResolvedValue({ id: "listing-1" }) },
          userCategoryActiveListing: {
            deleteMany: jest.fn().mockResolvedValue({ count: 1 })
          },
          chatThread: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) }
        })
      )
    };

    const service = new ReportsService(
      prisma,
      trustScoreServiceMock as any,
      featureFlagServiceMock as any,
      notificationsServiceMock as any,
      configServiceMock as any
    );

    await service.createReport("reporter-1", {
      reason: "spam",
      targetListingId: "listing-1"
    });

    expect(notificationsServiceMock.notifyUsers).toHaveBeenCalledWith(
      ["seller-1", "buyer-1"],
      "LISTING_DEACTIVATED",
      "Listing deactivated",
      "A listing was auto-hidden due to reports.",
      {
        listingId: "listing-1",
        reason: "auto_hide_reports",
        reportCount: 2,
        threshold: 2
      }
    );
  });

  it("writes audit log for admin report action", async () => {
    const prisma: any = {
      report: {
        findUnique: jest.fn().mockResolvedValue({
          id: "report-1",
          reporterId: "reporter-1",
          targetUserId: "target-1",
          targetListingId: null
        }),
        update: jest.fn().mockResolvedValue({
          id: "report-1",
          targetListingId: null
        })
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: "audit-1" })
      }
    };

    const service = new ReportsService(
      prisma,
      trustScoreServiceMock as any,
      featureFlagServiceMock as any,
      notificationsServiceMock as any,
      configServiceMock as any
    );

    await service.applyReportAction("admin-1", "report-1", ReportStatus.RESOLVED);

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          adminId: "admin-1",
          action: "REPORT_ACTION",
          targetType: "REPORT",
          targetId: "report-1"
        })
      })
    );
  });
});
