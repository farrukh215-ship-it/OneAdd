import Image from 'next/image';
import Link from 'next/link';
import { ListingGrid } from '../../../components/listings/ListingGrid';
import { distanceFromCity } from '../../../lib/distance';
import { toDisplayMediaUrl } from '../../../lib/media';
import { getListing, getListings } from '../../../lib/server-api';
import { ListingPublicChat } from './ListingPublicChat';

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await getListing(id);
  const related = await getListings({ category: listing.category.slug, limit: 4 });
  const sellerName = listing.user?.name || 'Seller';
  const initials = sellerName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const distanceKm = distanceFromCity(
    undefined,
    listing.city,
    undefined,
    typeof listing.lat === 'number' && typeof listing.lng === 'number'
      ? { lat: listing.lat, lng: listing.lng }
      : undefined,
  );
  const locationText = [listing.city, listing.area].filter(Boolean).join(', ');
  const heroImage = toDisplayMediaUrl(listing.images[0]);
  const galleryImages = listing.images
    .slice(0, 6)
    .map((image) => toDisplayMediaUrl(image))
    .filter(Boolean);

  return (
    <div className="page-wrap px-2 py-4 md:px-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section>
          <div className="surface overflow-hidden p-3">
            <div className="relative aspect-square overflow-hidden rounded-xl bg-border">
              {heroImage ? (
                <Image src={heroImage} alt={listing.title} fill unoptimized className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-7xl">📦</div>
              )}
            </div>
            <div className="hide-scrollbar mt-3 flex gap-2 overflow-x-auto">
              {galleryImages.map((image, index) => (
                <div key={index} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-border">
                  <Image src={image} alt={`${listing.title} ${index + 1}`} fill unoptimized className="object-cover" />
                </div>
              ))}
            </div>
          </div>
          <div className="surface mt-4 p-4">
            <div className="text-[22px] font-extrabold text-ink">
              PKR {listing.price.toLocaleString()}
            </div>
            <h1 className="mt-1 text-xl font-bold text-ink">{listing.title}</h1>
            <div className="mt-2 text-sm text-ink2">
              📍 {locationText || listing.city}
              {distanceKm !== null ? ` • ${distanceKm} km` : ''}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="badge-soft-green">✓ Asli Malik</span>
              <span className="badge-soft-gray">
                {listing.condition === 'NEW' ? 'Naya' : 'Purana'}
              </span>
              {listing.storeType ? <span className="badge-soft-gray">{listing.storeType} Dukaan</span> : null}
            </div>
          </div>
          <div className="surface mt-4 p-4">
            <div className="mb-2 text-sm font-bold text-ink">Description</div>
            <p className="text-sm leading-6 text-ink2">{listing.description}</p>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="surface p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F3F4F6] font-bold text-ink2">
                {initials}
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-ink">
                  {sellerName}
                  <span className="text-green">✓</span>
                </div>
                <div className="text-xs text-ink2">{listing.user?.city || listing.city}</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-ink2">
              Joined {new Date(listing.createdAt).toLocaleDateString('en-GB')}
            </div>
            <div className="mt-2 text-sm font-semibold text-green">
              Dealer nahi — asli malik
            </div>
          </div>
          <div className="surface p-4">
            <div className="grid gap-3">
              <Link href={`/auth?next=/listings/${listing.id}`} className="btn-red">
                Phone Number Dekho
              </Link>
              <a
                href={`https://wa.me/${listing.user?.id ?? ''}`}
                target="_blank"
                rel="noreferrer"
                className="btn-white"
              >
                WhatsApp pe Message
              </a>
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title">Aur Dekho</h2>
          <Link href={`/listings?category=${listing.category.slug}`} className="text-sm font-semibold text-red">
            Same category
          </Link>
        </div>
        <ListingGrid listings={related.data.filter((item) => item.id !== listing.id).slice(0, 4)} />
      </div>

      <ListingPublicChat listingId={listing.id} askingPrice={listing.price} />

      <div className="mobile-safe-bottom fixed inset-x-0 bottom-14 z-40 border-t border-border bg-white p-3 md:hidden">
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/auth?next=/listings/${listing.id}`} className="btn-red">
            Phone Number
          </Link>
          <a
            href={`https://wa.me/${listing.user?.id ?? ''}`}
            target="_blank"
            rel="noreferrer"
            className="btn-white"
          >
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
