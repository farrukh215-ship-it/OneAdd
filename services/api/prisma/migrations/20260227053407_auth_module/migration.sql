/*
  Warnings:

  - You are about to drop the column `displayName` on the `User` table. All the data in the column will be lost.
  - Added the required column `city` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dateOfBirth` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fatherName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fullName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gender` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passwordHash` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('LOGIN');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "displayName",
ADD COLUMN     "city" VARCHAR(120) NOT NULL,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "fatherName" VARCHAR(160) NOT NULL,
ADD COLUMN     "fullName" VARCHAR(160) NOT NULL,
ADD COLUMN     "gender" "Gender" NOT NULL,
ADD COLUMN     "passwordHash" VARCHAR(255) NOT NULL,
ADD COLUMN     "phoneVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "profilePhotoUrl" VARCHAR(2048);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "phone" VARCHAR(24) NOT NULL,
    "purpose" "OtpPurpose" NOT NULL DEFAULT 'LOGIN',
    "otpHash" VARCHAR(128) NOT NULL,
    "fingerprintHash" VARCHAR(128) NOT NULL,
    "ip" VARCHAR(64) NOT NULL,
    "userAgent" VARCHAR(1024),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "verifiedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_otp_rate_limit_phone_created" ON "OtpCode"("phone", "createdAt");

-- CreateIndex
CREATE INDEX "idx_otp_rate_limit_ip_created" ON "OtpCode"("ip", "createdAt");

-- CreateIndex
CREATE INDEX "idx_otp_rate_limit_fingerprint_created" ON "OtpCode"("fingerprintHash", "createdAt");

-- CreateIndex
CREATE INDEX "idx_otp_verify_phone_purpose_expires" ON "OtpCode"("phone", "purpose", "expiresAt");

-- AddForeignKey
ALTER TABLE "OtpCode" ADD CONSTRAINT "OtpCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
