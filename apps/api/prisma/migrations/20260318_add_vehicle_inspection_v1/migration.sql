DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
    CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'WORKSHOP_MANAGER', 'POLICE_OFFICER');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ListingInspectionStatus') THEN
    CREATE TYPE "ListingInspectionStatus" AS ENUM (
      'NONE',
      'REQUESTED',
      'BOOKED',
      'WORKSHOP_VERIFIED',
      'POLICE_VERIFIED',
      'SUBMITTED',
      'APPROVED',
      'REJECTED',
      'EXPIRED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InspectionRequestStatus') THEN
    CREATE TYPE "InspectionRequestStatus" AS ENUM (
      'REQUESTED',
      'BOOKED',
      'WORKSHOP_VERIFIED',
      'POLICE_VERIFIED',
      'SUBMITTED',
      'APPROVED',
      'REJECTED',
      'EXPIRED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InspectionVerdict') THEN
    CREATE TYPE "InspectionVerdict" AS ENUM ('RECOMMENDED', 'CAUTION', 'NOT_RECOMMENDED');
  END IF;
END $$;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'USER';

ALTER TABLE "Listing"
  ADD COLUMN IF NOT EXISTS "inspectionStatus" "ListingInspectionStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "isInspectionApproved" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "inspectionApprovedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "inspectionBadgeLabel" TEXT DEFAULT 'TGMG Inspected';

CREATE TABLE IF NOT EXISTS "WorkshopPartner" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "contact" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkshopPartner_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WorkshopPartner_city_active_idx"
ON "WorkshopPartner"("city", "active");

CREATE TABLE IF NOT EXISTS "InspectionRequest" (
  "id" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "workshopPartnerId" TEXT,
  "status" "InspectionRequestStatus" NOT NULL DEFAULT 'REQUESTED',
  "bookedDate" TIMESTAMP(3),
  "offlineFee" INTEGER NOT NULL DEFAULT 3000,
  "workshopPayout" INTEGER NOT NULL DEFAULT 2500,
  "tgmgCommission" INTEGER NOT NULL DEFAULT 500,
  "offlinePaymentAcknowledged" BOOLEAN NOT NULL DEFAULT false,
  "workshopVerifiedById" TEXT,
  "policeVerifiedById" TEXT,
  "adminReviewedById" TEXT,
  "submittedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "rejectionNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InspectionRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InspectionRequest_listingId_status_idx"
ON "InspectionRequest"("listingId", "status");

CREATE INDEX IF NOT EXISTS "InspectionRequest_sellerId_status_idx"
ON "InspectionRequest"("sellerId", "status");

CREATE INDEX IF NOT EXISTS "InspectionRequest_workshopPartnerId_status_idx"
ON "InspectionRequest"("workshopPartnerId", "status");

CREATE TABLE IF NOT EXISTS "InspectionReport" (
  "id" TEXT NOT NULL,
  "inspectionRequestId" TEXT NOT NULL,
  "vehicleInfo" JSONB NOT NULL,
  "ownerVerification" JSONB NOT NULL,
  "avlsVerification" JSONB NOT NULL,
  "mechanicalChecklist" JSONB NOT NULL,
  "bodyChecklist" JSONB NOT NULL,
  "interiorChecklist" JSONB NOT NULL,
  "tyreChecklist" JSONB NOT NULL,
  "evidencePhotos" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "formPageFrontUrl" TEXT,
  "formPageBackUrl" TEXT,
  "overallRating" INTEGER,
  "verdict" "InspectionVerdict",
  "signatures" JSONB NOT NULL,
  "stamps" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InspectionReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InspectionReport_inspectionRequestId_key"
ON "InspectionReport"("inspectionRequestId");

CREATE TABLE IF NOT EXISTS "InspectionAuditLog" (
  "id" TEXT NOT NULL,
  "inspectionRequestId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorRole" "UserRole",
  "action" TEXT NOT NULL,
  "note" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InspectionAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InspectionAuditLog_inspectionRequestId_createdAt_idx"
ON "InspectionAuditLog"("inspectionRequestId", "createdAt");

CREATE INDEX IF NOT EXISTS "InspectionAuditLog_actorUserId_createdAt_idx"
ON "InspectionAuditLog"("actorUserId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InspectionRequest_listingId_fkey'
  ) THEN
    ALTER TABLE "InspectionRequest"
      ADD CONSTRAINT "InspectionRequest_listingId_fkey"
      FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InspectionRequest_sellerId_fkey'
  ) THEN
    ALTER TABLE "InspectionRequest"
      ADD CONSTRAINT "InspectionRequest_sellerId_fkey"
      FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InspectionRequest_workshopPartnerId_fkey'
  ) THEN
    ALTER TABLE "InspectionRequest"
      ADD CONSTRAINT "InspectionRequest_workshopPartnerId_fkey"
      FOREIGN KEY ("workshopPartnerId") REFERENCES "WorkshopPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InspectionRequest_workshopVerifiedById_fkey'
  ) THEN
    ALTER TABLE "InspectionRequest"
      ADD CONSTRAINT "InspectionRequest_workshopVerifiedById_fkey"
      FOREIGN KEY ("workshopVerifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InspectionRequest_policeVerifiedById_fkey'
  ) THEN
    ALTER TABLE "InspectionRequest"
      ADD CONSTRAINT "InspectionRequest_policeVerifiedById_fkey"
      FOREIGN KEY ("policeVerifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InspectionRequest_adminReviewedById_fkey'
  ) THEN
    ALTER TABLE "InspectionRequest"
      ADD CONSTRAINT "InspectionRequest_adminReviewedById_fkey"
      FOREIGN KEY ("adminReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InspectionReport_inspectionRequestId_fkey'
  ) THEN
    ALTER TABLE "InspectionReport"
      ADD CONSTRAINT "InspectionReport_inspectionRequestId_fkey"
      FOREIGN KEY ("inspectionRequestId") REFERENCES "InspectionRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InspectionAuditLog_inspectionRequestId_fkey'
  ) THEN
    ALTER TABLE "InspectionAuditLog"
      ADD CONSTRAINT "InspectionAuditLog_inspectionRequestId_fkey"
      FOREIGN KEY ("inspectionRequestId") REFERENCES "InspectionRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InspectionAuditLog_actorUserId_fkey'
  ) THEN
    ALTER TABLE "InspectionAuditLog"
      ADD CONSTRAINT "InspectionAuditLog_actorUserId_fkey"
      FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
