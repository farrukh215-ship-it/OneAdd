-- Remove TruYou / KYC data model
DROP TABLE IF EXISTS "TruYouVerification";

DROP INDEX IF EXISTS "idx_user_truyou_status_created";
DROP INDEX IF EXISTS "idx_user_reverify_required_at";
DROP INDEX IF EXISTS "idx_user_moderation_truyou";

ALTER TABLE "User"
  DROP COLUMN IF EXISTS "truYouStatus",
  DROP COLUMN IF EXISTS "truYouVerifiedAt",
  DROP COLUMN IF EXISTS "reverifyRequiredAt";

DROP TYPE IF EXISTS "TruYouStatus";
