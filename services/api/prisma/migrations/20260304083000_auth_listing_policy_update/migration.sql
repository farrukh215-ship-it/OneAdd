-- Expand OTP purposes for signup, password reset, and listing publish confirmation.
DO $$
BEGIN
  ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'SIGNUP';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'PASSWORD_RESET';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'LISTING_PUBLISH';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Negotiable listings support.
ALTER TABLE "Listing"
ADD COLUMN IF NOT EXISTS "isNegotiable" BOOLEAN NOT NULL DEFAULT false;
