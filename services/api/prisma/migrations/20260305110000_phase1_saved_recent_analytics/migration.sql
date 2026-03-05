-- CreateTable
CREATE TABLE "SavedListing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecentlyViewedListing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecentlyViewedListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingViewEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingViewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_saved_listing_user_listing" ON "SavedListing"("userId", "listingId");

-- CreateIndex
CREATE INDEX "idx_saved_listing_user_created" ON "SavedListing"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_saved_listing_listing_created" ON "SavedListing"("listingId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "uq_recent_listing_user_listing" ON "RecentlyViewedListing"("userId", "listingId");

-- CreateIndex
CREATE INDEX "idx_recent_listing_user_viewed" ON "RecentlyViewedListing"("userId", "viewedAt" DESC);

-- CreateIndex
CREATE INDEX "idx_recent_listing_listing_viewed" ON "RecentlyViewedListing"("listingId", "viewedAt" DESC);

-- CreateIndex
CREATE INDEX "idx_listing_view_event_listing_viewed" ON "ListingViewEvent"("listingId", "viewedAt" DESC);

-- CreateIndex
CREATE INDEX "idx_listing_view_event_user_viewed" ON "ListingViewEvent"("userId", "viewedAt" DESC);

-- AddForeignKey
ALTER TABLE "SavedListing" ADD CONSTRAINT "SavedListing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedListing" ADD CONSTRAINT "SavedListing_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecentlyViewedListing" ADD CONSTRAINT "RecentlyViewedListing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecentlyViewedListing" ADD CONSTRAINT "RecentlyViewedListing_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingViewEvent" ADD CONSTRAINT "ListingViewEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingViewEvent" ADD CONSTRAINT "ListingViewEvent_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
