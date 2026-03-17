import type { Listing } from '@tgmg/types';
import { ListingCard } from './ListingCard';

export function ListingGrid({
  listings,
  loading = false,
  referenceCity,
  referenceLat,
  referenceLng,
}: {
  listings: Listing[];
  loading?: boolean;
  referenceCity?: string;
  referenceLat?: number;
  referenceLng?: number;
}) {
  const safeListings = listings.filter((listing) => Array.isArray(listing.images) && listing.images.length > 0);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2 px-2 sm:grid-cols-3 sm:gap-3 sm:px-3 lg:grid-cols-4 lg:px-10">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="surface overflow-hidden">
            <div className="skeleton aspect-square" />
            <div className="space-y-2 p-3">
              <div className="skeleton h-4 rounded-md" />
              <div className="skeleton h-3 rounded-md" />
              <div className="skeleton h-3 w-2/3 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 px-2 sm:grid-cols-3 sm:gap-3 sm:px-3 lg:grid-cols-4 lg:px-10">
      {safeListings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          referenceCity={referenceCity}
          referenceLat={referenceLat}
          referenceLng={referenceLng}
        />
      ))}
    </div>
  );
}
