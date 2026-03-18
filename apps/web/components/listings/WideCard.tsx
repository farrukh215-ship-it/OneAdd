'use client';

import type { Listing } from '@tgmg/types';
import Link from 'next/link';
import { useState } from 'react';
import { toDisplayMediaUrl } from '../../lib/media';

export function WideCard({ listing }: { listing: Listing }) {
  const image = listing.images[0];
  const displayImage = toDisplayMediaUrl(image);
  const [imageFailed, setImageFailed] = useState(false);
  const statusLabel =
    listing.isFeatured
      ? 'Featured'
      : listing.status === 'SOLD'
        ? 'Sold'
        : listing.status === 'PENDING'
          ? 'Pending'
          : listing.status === 'DELETED' || listing.status === 'INACTIVE'
            ? 'Inactive'
            : 'Available';
  const statusClassName =
    statusLabel === 'Available'
      ? 'rounded-full bg-green px-2.5 py-1 text-[11px] font-bold text-white'
      : 'badge-soft-gray';

  return (
    <Link href={`/listings/${listing.id}`} className="surface flex gap-3 overflow-hidden p-3">
      <div className="relative h-[90px] w-[90px] shrink-0 overflow-hidden rounded-xl bg-border">
        {displayImage && !imageFailed ? (
          <img
            src={displayImage}
            alt={listing.title}
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl text-ink3">No image</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[18px] font-extrabold text-ink">
          PKR {listing.price.toLocaleString()}
        </div>
        <div className="mt-1 truncate text-[13px] font-semibold text-ink2">{listing.title}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="badge-soft-green">Asli Malik</span>
          {listing.isInspectionApproved ? (
            <span className="badge-soft-green">{listing.inspectionBadgeLabel || 'TGMG Inspected'}</span>
          ) : null}
          <span className="badge-soft-gray">{listing.condition === 'NEW' ? 'New' : 'Used'}</span>
          <span className={statusClassName}>{statusLabel}</span>
          {listing.storeType ? <span className="badge-soft-gray">{listing.storeType}</span> : null}
        </div>
        <div className="mt-2 text-[11px] text-ink3">
          {[listing.city, listing.area].filter(Boolean).join(', ')} •{' '}
          {new Date(listing.createdAt).toLocaleDateString('en-GB')}
        </div>
      </div>
    </Link>
  );
}
