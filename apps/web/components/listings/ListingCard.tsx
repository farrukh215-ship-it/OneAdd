import type { Listing } from '@tgmg/types';
import Image from 'next/image';
import Link from 'next/link';
import { distanceFromCity } from '../../lib/distance';

export function ListingCard({
  listing,
  referenceCity,
}: {
  listing: Listing;
  referenceCity?: string;
}) {
  const image = listing.images[0];
  const location = [listing.city, listing.area].filter(Boolean).join(', ');
  const distance = distanceFromCity(referenceCity, listing.city);

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="surface block overflow-hidden transition-transform active:scale-[0.97]"
    >
      <div className="relative aspect-square bg-border">
        {image ? (
          <Image
            src={image}
            alt={listing.title}
            fill
            unoptimized
            className="object-cover"
          />
        ) : null}
        <div className="absolute bottom-2 left-2">
          <span className="badge-green">✓ Asli Malik</span>
        </div>
        <button
          type="button"
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-sm shadow-card"
          aria-label="Save ad"
        >
          ♡
        </button>
      </div>
      <div className="p-[10px]">
        <div className="text-base font-extrabold text-ink sm:text-lg">
          PKR {listing.price.toLocaleString()}
        </div>
        <div className="mt-1 clamp-2 text-[12px] leading-5 text-ink2">
          {listing.title}
        </div>
        <div className="mt-2 text-[11px] text-ink3">
          📍 {location || listing.city}
          {distance !== null ? ` • ${distance} km door` : ''}
        </div>
      </div>
    </Link>
  );
}
