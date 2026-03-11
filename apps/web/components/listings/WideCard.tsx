import type { Listing } from '@tgmg/types';
import Image from 'next/image';
import Link from 'next/link';

export function WideCard({ listing }: { listing: Listing }) {
  const image = listing.images[0];

  return (
    <Link href={`/listings/${listing.id}`} className="surface flex gap-3 overflow-hidden p-3">
      <div className="relative h-[90px] w-[90px] shrink-0 overflow-hidden rounded-xl bg-border">
        {image ? (
          <Image src={image} alt={listing.title} fill unoptimized className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">📦</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[18px] font-extrabold text-ink">
          PKR {listing.price.toLocaleString()}
        </div>
        <div className="mt-1 truncate text-[13px] font-semibold text-ink2">{listing.title}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="badge-soft-green">✓ Asli Malik</span>
          <span className="badge-soft-gray">{listing.condition === 'NEW' ? 'New' : 'Used'}</span>
        </div>
        <div className="mt-2 text-[11px] text-ink3">
          📍 {[listing.city, listing.area].filter(Boolean).join(', ')} ·{' '}
          {new Date(listing.createdAt).toLocaleDateString('en-GB')}
        </div>
      </div>
    </Link>
  );
}
