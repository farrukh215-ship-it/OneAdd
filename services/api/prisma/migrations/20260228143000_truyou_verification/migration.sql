-- CreateEnum
CREATE TYPE "TruYouStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REVERIFY_REQUIRED', 'REJECTED');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "truYouStatus" "TruYouStatus" NOT NULL DEFAULT 'UNVERIFIED',
ADD COLUMN "truYouVerifiedAt" TIMESTAMP(3),
ADD COLUMN "reverifyRequiredAt" TIMESTAMP(3),
ADD COLUMN "riskSignals" JSONB;

-- CreateTable
CREATE TABLE "TruYouVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "governmentIdType" VARCHAR(32) NOT NULL,
    "governmentIdNumber" VARCHAR(64) NOT NULL,
    "governmentIdImageUrl" VARCHAR(2048) NOT NULL,
    "selfieImageUrl" VARCHAR(2048) NOT NULL,
    "status" "TruYouStatus" NOT NULL DEFAULT 'PENDING',
    "provider" VARCHAR(64),
    "providerReference" VARCHAR(120),
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "reviewNotes" VARCHAR(512),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TruYouVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TruYouVerification_userId_key" ON "TruYouVerification"("userId");

-- CreateIndex
CREATE INDEX "idx_user_truyou_status_created" ON "User"("truYouStatus", "createdAt");

-- CreateIndex
CREATE INDEX "idx_user_reverify_required_at" ON "User"("reverifyRequiredAt");

-- CreateIndex
CREATE INDEX "idx_user_moderation_truyou" ON "User"("shadowBanned", "truYouStatus");

-- CreateIndex
CREATE INDEX "idx_truyou_status_submitted" ON "TruYouVerification"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "idx_truyou_risk_updated" ON "TruYouVerification"("riskScore", "updatedAt");

-- AddForeignKey
ALTER TABLE "TruYouVerification" ADD CONSTRAINT "TruYouVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
