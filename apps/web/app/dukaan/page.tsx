import Link from 'next/link';

export default async function DukaanPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const params = await searchParams;
  const city = params.city || 'Lahore';

  return (
    <section className="page-wrap px-3 py-5 md:px-5">
      <div className="surface p-5">
        <h1 className="text-2xl font-extrabold text-ink">Dukaan Chuno</h1>
        <p className="mt-2 text-sm text-ink2">
          Apni zarurat ke mutabiq dukaan type select karein.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Link
            href={`/listings?store=online&city=${encodeURIComponent(city)}`}
            className="surface block p-4 transition-transform hover:-translate-y-0.5"
          >
            <div className="text-xl font-bold text-ink">Online Dukaan</div>
            <div className="mt-1 text-sm text-ink2">
              Pure Pakistan se online listings dekhein.
            </div>
          </Link>

          <Link
            href={`/listings?store=road&city=${encodeURIComponent(city)}`}
            className="surface block p-4 transition-transform hover:-translate-y-0.5"
          >
            <div className="text-xl font-bold text-ink">Road Dukaan</div>
            <div className="mt-1 text-sm text-ink2">
              {city} aur aas paas ki location wali dukaan listings.
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
