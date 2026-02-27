-- CreateEnum
CREATE TYPE "ChatThreadStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable
ALTER TABLE "ChatThread" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "status" "ChatThreadStatus" NOT NULL DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "allowCall" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowChat" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowSMS" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "rankingScore" DECIMAL(10,4) NOT NULL DEFAULT 1,
ADD COLUMN     "showPhone" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "shadowBanned" BOOLEAN NOT NULL DEFAULT false;
