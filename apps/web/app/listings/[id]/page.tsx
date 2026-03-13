import type { ReactNode } from 'react';
import Link from 'next/link';
import { ListingGrid } from '../../../components/listings/ListingGrid';
import { distanceFromCity } from '../../../lib/distance';
import { getListing, getListings } from '../../../lib/server-api';
import {
  CalendarIcon,
  ClockIcon,
  LocationIcon,
  VerifiedIcon,
} from './DetailIcons';
import { ListingDescriptionClient } from './ListingDescriptionClient';
import { ListingMediaCarousel } from './ListingMediaCarousel';
import { ListingPublicChat } from './ListingPublicChat';
import { SellerSidebarClient } from './SellerSidebarClient';

function FactChip({
  icon,
  text,
  tone = 'default',
}: {
  icon: ReactNode;
  text: string;
  tone?: 'default' | 'success';
}) {
  return (
    <span
      className={`detail-chip ${
        tone === 'success' ? 'bg-[rgba(46,125,50,0.09)] text-green' : ''
      }`}
    >
      {icon}
      <span>{text}</span>
    </span>
  );
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await getListing(id);
  const related = await getListings({ category: listing.category.slug, limit: 4 });
  const sellerName = listing.user?.name || 'Seller';
  const locationText = [listing.city, listing.area].filter(Boolean).join(', ');
  const sellerLocation = [listing.user?.area || listing.area, listing.user?.city || listing.city]
    .filter(Boolean)
    .join(', ');
  const detailDistance =
    typeof listing.distanceKm === 'number'
      ? Math.round(listing.distanceKm)
      : distanceFromCity(
          undefined,
          listing.city,
          undefined,
          typeof listing.lat === 'number' && typeof listing.lng === 'number'
            ? { lat: listing.lat, lng: listing.lng }
            : undefined,
        );

  return (
    <div className="bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.94),_rgba(240,242,245,1)_48%)]">
      <div className="page-wrap px-3 py-4 md:px-5 md:py-6">
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.18fr)_360px]">
          <section className="min-w-0">
            <ListingMediaCarousel images={listing.images.slice(0, 6)} title={listing.title} />

            <div className="surface-premium mt-5 p-5 md:p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-ink3">
                    Premium listing
                  </div>
                  <div className="mt-2 text-3xl font-black tracking-tight text-ink md:text-[40px]">
                    PKR {listing.price.toLocaleString()}
                  </div>
                  <h1 className="mt-2 max-w-3xl text-2xl font-extrabold leading-tight text-ink md:text-[32px]">
                    {listing.title}
                  </h1>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <FactChip icon={<VerifiedIcon />} text="Asli Malik" tone="success" />
                    <FactChip icon={<LocationIcon />} text={locationText || listing.city} />
                    {detailDistance !== null ? (
                      <FactChip icon={<LocationIcon />} text={`${detailDistance} km door`} />
                    ) : null}
                    <FactChip
                      icon={<CalendarIcon />}
                      text={`Posted ${new Date(listing.createdAt).toLocaleDateString('en-GB')}`}
                    />
                    <FactChip
                      icon={<ClockIcon />}
                      text={`Updated ${new Date(listing.updatedAt).toLocaleDateString('en-GB')}`}
                    />
                  </div>
                </div>

                <div className="rounded-[22px] border border-black/5 bg-[linear-gradient(180deg,_rgba(248,249,251,0.95),_rgba(255,255,255,0.95))] p-4 md:w-[280px]">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-ink3">
                    Quick facts
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="detail-stat">
                      <div className="detail-stat-label">Condition</div>
                      <div className="detail-stat-value">
                        {listing.condition === 'NEW' ? 'New' : 'Used'}
                      </div>
                    </div>
                    <div className="detail-stat">
                      <div className="detail-stat-label">Category</div>
                      <div className="detail-stat-value">{listing.category.name}</div>
                    </div>
                    <div className="detail-stat">
                      <div className="detail-stat-label">Store type</div>
                      <div className="detail-stat-value">
                        {listing.storeType ? listing.storeType : 'Normal ad'}
                      </div>
                    </div>
                    <div className="detail-stat">
                      <div className="detail-stat-label">Area</div>
                      <div className="detail-stat-value">{listing.area || listing.city}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <ListingDescriptionClient description={listing.description} />
          </section>

          <aside className="min-w-0">
            <SellerSidebarClient
              listingId={listing.id}
              sellerName={sellerName}
              sellerVerified={Boolean(listing.user?.verified)}
              sellerLocation={sellerLocation}
              joinedAt={listing.user?.createdAt}
              sellerLastOnlineAt={listing.user?.updatedAt}
              listingCreatedAt={listing.createdAt}
              listingUpdatedAt={listing.updatedAt}
              sellerCity={listing.user?.city || listing.city}
              sellerLat={listing.lat}
              sellerLng={listing.lng}
            />
          </aside>
        </div>

        <div className="surface-premium mt-7 p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-ink3">
                Related
              </div>
              <h2 className="mt-1 text-xl font-extrabold text-ink">Aur Dekho</h2>
            </div>
            <Link href={`/listings?category=${listing.category.slug}`} className="text-sm font-semibold text-red">
              Same category
            </Link>
          </div>
          <ListingGrid listings={related.data.filter((item) => item.id !== listing.id).slice(0, 4)} />
        </div>

        <ListingPublicChat listingId={listing.id} askingPrice={listing.price} />
      </div>
    </div>
  );
}
