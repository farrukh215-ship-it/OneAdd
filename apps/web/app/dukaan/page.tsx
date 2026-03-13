import Link from 'next/link';
import { ListingGrid } from '../../components/listings/ListingGrid';
import { SectionHeader } from '../../components/home/SectionHeader';
import { getListings } from '../../lib/server-api';

export default async function DukaanPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const params = await searchParams;
  const city = params.city || 'Lahore';
  const [online, road] = await Promise.all([
    getListings({ store: 'online', city, limit: 8 }).then((result) => result.data),
    getListings({ store: 'road', city, limit: 8 }).then((result) => result.data),
  ]);

  return (
    <section className="page-wrap px-3 py-5 md:px-5">
      <div className="surface p-5">
        <h1 className="text-2xl font-extrabold text-ink">Dukaan Zone</h1>
        <p className="mt-2 text-sm text-ink2">
          Yahan sirf Dukaan ads dikhte hain. Normal user ads is page par show nahi hongi.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="surface p-4">
            <div className="text-xl font-bold text-ink">Online Dukaan</div>
            <div className="mt-1 text-sm text-ink2">Online store products poore Pakistan se.</div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/listings?store=online&city=${encodeURIComponent(city)}`} className="btn-white">
                Listings Dekho
              </Link>
              <Link href="/post?mode=dukaan&store=online" className="btn-red">
                Dukaan Ad Post
              </Link>
            </div>
          </div>

          <div className="surface p-4">
            <div className="text-xl font-bold text-ink">Road Dukaan</div>
            <div className="mt-1 text-sm text-ink2">
              {city} aur aas paas ke area ki shop listings.
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/listings?store=road&city=${encodeURIComponent(city)}`} className="btn-white">
                Listings Dekho
              </Link>
              <Link href="/post?mode=dukaan&store=road" className="btn-red">
                Dukaan Ad Post
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <SectionHeader title="Online Dukaan Ads" link={`/listings?store=online&city=${encodeURIComponent(city)}`} />
        <ListingGrid listings={online.slice(0, 8)} referenceCity={city} />
      </div>

      <div className="mt-5">
        <SectionHeader title={`Road Dukaan Ads (${city})`} link={`/listings?store=road&city=${encodeURIComponent(city)}`} />
        <ListingGrid listings={road.slice(0, 8)} referenceCity={city} />
      </div>
    </section>
  );
}
