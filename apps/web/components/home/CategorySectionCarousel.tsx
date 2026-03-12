import type { Listing } from '@tgmg/types';
import { SectionHeader } from './SectionHeader';
import { ListingCard } from '../listings/ListingCard';

export function CategorySectionCarousel({
  title,
  slug,
  listings,
  city,
}: {
  title: string;
  slug: string;
  listings: Listing[];
  city?: string;
}) {
  if (!listings.length) return null;

  return (
    <section id={`category-${slug}`} className="border-t border-border bg-white">
      <div className="page-wrap pb-2">
        <SectionHeader title={title} link={`/listings?category=${slug}${city ? `&city=${encodeURIComponent(city)}` : ''}`} />

        <div className="hide-scrollbar flex gap-2 overflow-x-auto px-2 pb-2 md:hidden">
          {listings.map((listing) => (
            <div key={listing.id} className="w-[46vw] min-w-[46vw]">
              <ListingCard listing={listing} referenceCity={city} />
            </div>
          ))}
        </div>

        <div className="hidden grid-cols-2 gap-3 px-5 pb-4 sm:grid md:grid-cols-3 lg:grid-cols-4">
          {listings.slice(0, 8).map((listing) => (
            <ListingCard key={listing.id} listing={listing} referenceCity={city} />
          ))}
        </div>
      </div>
    </section>
  );
}
