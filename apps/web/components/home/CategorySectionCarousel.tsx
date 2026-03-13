'use client';

import { useRef } from 'react';
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
  const items = listings.slice(0, 6);
  const railRef = useRef<HTMLDivElement>(null);

  const slide = (direction: 'left' | 'right') => {
    const rail = railRef.current;
    if (!rail) return;
    const step = Math.max(240, Math.floor(rail.clientWidth * 0.75));
    rail.scrollBy({
      left: direction === 'left' ? -step : step,
      behavior: 'smooth',
    });
  };

  return (
    <section id={`category-${slug}`} className="border-t border-border bg-white">
      <div className="page-wrap pb-2">
        <SectionHeader
          title={title}
          link={`/listings?category=${slug}${city ? `&city=${encodeURIComponent(city)}` : ''}`}
        />

        {!items.length ? (
          <div className="px-4 pb-4 md:px-5">
            <div className="rounded-2xl border border-border bg-[#F8F9FB] p-4 text-sm text-ink2">
              Is category mein abhi listing nahi mili.
            </div>
          </div>
        ) : null}

        {items.length ? (
          <div className="mb-2 flex items-center justify-end gap-2 px-2 md:hidden">
            <button type="button" onClick={() => slide('left')} className="btn-white !px-3 !py-2 text-xs">
              {'<'}
            </button>
            <button type="button" onClick={() => slide('right')} className="btn-white !px-3 !py-2 text-xs">
              {'>'}
            </button>
          </div>
        ) : null}

        {items.length ? (
          <div ref={railRef} className="hide-scrollbar flex gap-2 overflow-x-auto px-2 pb-2 md:hidden">
            {items.map((listing) => (
              <div key={listing.id} className="w-[46vw] min-w-[46vw]">
                <ListingCard listing={listing} referenceCity={city} />
              </div>
            ))}
          </div>
        ) : null}

        {items.length ? (
          <div className="hidden grid-cols-2 gap-3 px-5 pb-4 sm:grid md:grid-cols-3 lg:grid-cols-4">
            {items.map((listing) => (
              <ListingCard key={listing.id} listing={listing} referenceCity={city} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
