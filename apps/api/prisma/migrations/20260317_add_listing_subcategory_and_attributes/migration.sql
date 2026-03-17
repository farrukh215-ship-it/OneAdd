ALTER TABLE "Listing"
ADD COLUMN "subcategorySlug" TEXT,
ADD COLUMN "subcategoryName" TEXT,
ADD COLUMN "attributes" JSONB;
