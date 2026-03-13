import type { Listing } from '@tgmg/types';
import Image from 'next/image';
import Link from 'next/link';
import { distanceFromCity } from '../../lib/distance';
import { toDisplayMediaUrl } from '../../lib/media';

export function ListingCard({
  listing,
  referenceCity,
  referenceLat,
  referenceLng,
}: {
  listing: Listing;
  referenceCity?: string;
  referenceLat?: number;
  referenceLng?: number;
}) {
  const image = listing.images[0];
  const displayImage = toDisplayMediaUrl(image);
  const location = [listing.city, listing.area].filter(Boolean).join(', ');
  const distance = distanceFromCity(
    referenceCity,
    listing.city,
    referenceLat !== undefined && referenceLng !== undefined
      ? { lat: referenceLat, lng: referenceLng }
      : undefined,
    typeof listing.lat === 'number' && typeof listing.lng === 'number'
      ? { lat: listing.lat, lng: listing.lng }
      : undefined,
  );
  const effectiveDistance = typeof listing.distanceKm === 'number' ? Math.round(listing.distanceKm) : distance;
  const nearby = listing.isNearby || (typeof effectiveDistance === 'number' && effectiveDistance <= 10);

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="surface block overflow-hidden transition-transform active:scale-[0.97]"
    >
      <div className="relative aspect-square bg-border">
        {displayImage ? (
          <Image
            src={displayImage}
            alt={listing.title}
            fill
            unoptimized
            className="object-cover"
          />
        ) : null}
        <div className="absolute bottom-2 left-2">
          <span className="badge-green">✓ Asli Malik</span>
        </div>
        <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-sm shadow-card">
          ♡
        </span>
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
          {effectiveDistance !== null ? ` • ${effectiveDistance} km door` : ''}
          {nearby ? ' • Near' : ''}
        </div>
      </div>
    </Link>
  );
}
