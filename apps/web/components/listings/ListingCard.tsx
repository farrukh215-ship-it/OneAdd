'use client';

import type { Listing } from '@tgmg/types';
import Link from 'next/link';
import { useState } from 'react';
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
  const [imageFailed, setImageFailed] = useState(false);
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
  const effectiveDistance =
    typeof listing.distanceKm === 'number' ? Math.round(listing.distanceKm) : distance;
  const nearby = listing.isNearby || (typeof effectiveDistance === 'number' && effectiveDistance <= 10);
  const statusBadge =
    listing.isFeatured
      ? { label: 'Featured', className: 'bg-[#FFF1D8] text-[#B4690E]' }
      : listing.status === 'SOLD'
      ? { label: 'Sold', className: 'bg-[#FDECEC] text-red' }
      : listing.status === 'PENDING'
        ? { label: 'Pending', className: 'bg-[#FFF7D6] text-[#8A6B00]' }
      : listing.status === 'DELETED'
        ? { label: 'Inactive', className: 'bg-[#EFF1F4] text-ink2' }
        : { label: 'Available', className: 'bg-green text-white' };

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="surface block overflow-hidden transition-transform active:scale-[0.97]"
    >
      <div className="relative aspect-square bg-border">
        {displayImage && !imageFailed ? (
          <img
            src={displayImage}
            alt={listing.title}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : null}
        <div className="absolute bottom-2 left-2">
          <span className="badge-green">Asli Malik</span>
        </div>
        {listing.isInspectionApproved ? (
          <div className="absolute bottom-2 right-2">
            <span className="rounded-full bg-[rgba(46,125,50,0.95)] px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
              {listing.inspectionBadgeLabel || 'TGMG Inspected'}
            </span>
          </div>
        ) : null}
        <div className="absolute left-2 top-2">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm ${statusBadge.className}`}>
            {statusBadge.label}
          </span>
        </div>
        <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-sm shadow-card">
          Fav
        </span>
      </div>
      <div className="p-[10px]">
        <div className="text-base font-extrabold text-ink sm:text-lg">
          PKR {listing.price.toLocaleString()}
        </div>
        <div className="mt-1 clamp-2 text-[12px] leading-5 text-ink2">{listing.title}</div>
        <div className="mt-2 text-[11px] text-ink3">
          {location || listing.city}
          {effectiveDistance !== null ? ` • ${effectiveDistance} km door` : ''}
          {nearby ? ' • Near' : ''}
        </div>
      </div>
    </Link>
  );
}
