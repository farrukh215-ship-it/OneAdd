'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ListingGrid } from '../../components/listings/ListingGrid';
import { useCategories } from '../../hooks/useCategories';
import { useListings } from '../../hooks/useListings';

const cities = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad'];

export function ListingsPageClient({
  initialParams,
}: {
  initialParams: {
    category?: string;
    city?: string;
    store?: string;
    minPrice?: number;
    maxPrice?: number;
    condition?: 'NEW' | 'USED';
    sort?: string;
    page?: number;
  };
}) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const filters = useMemo(
    () => ({
      ...initialParams,
      page: initialParams.page ?? 1,
      limit: 20,
      sort: initialParams.sort ?? 'newest',
    }),
    [initialParams],
  );
  const { data: categories = [] } = useCategories();
  const { data, isLoading } = useListings(filters);
  const cityQuery = filters.city ? `&city=${encodeURIComponent(filters.city)}` : '';

  const sidebar = (
    <div className="surface sticky top-[76px] space-y-4 p-4">
      <div>
        <div className="mb-2 text-sm font-bold">Categories</div>
        <div className="space-y-2">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/listings?category=${category.slug}${cityQuery}`}
              className={`block rounded-xl px-3 py-2 text-sm ${
                filters.category === category.slug ? 'bg-red-light text-red' : 'bg-[#F8F9FB] text-ink2'
              }`}
            >
              {category.icon} {category.name}
            </Link>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-bold">Dukaan type</div>
        <div className="flex gap-2">
          <Link href={`/listings?store=online${cityQuery}`} className={`chip ${filters.store === 'online' ? 'active' : ''}`}>
            Online
          </Link>
          <Link href={`/listings?store=road${cityQuery}`} className={`chip ${filters.store === 'road' ? 'active' : ''}`}>
            Road
          </Link>
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-bold">Price range</div>
        <div className="grid grid-cols-2 gap-2">
          <input defaultValue={filters.minPrice} className="field-input" placeholder="Min" />
          <input defaultValue={filters.maxPrice} className="field-input" placeholder="Max" />
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-bold">City</div>
        <select defaultValue={filters.city} className="field-select">
          <option value="">Sab cities</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="mb-2 text-sm font-bold">Condition</div>
        <div className="flex gap-2">
          <button type="button" className={`chip ${filters.condition === 'NEW' ? 'active' : ''}`}>New</button>
          <button type="button" className={`chip ${filters.condition === 'USED' ? 'active' : ''}`}>Used</button>
        </div>
      </div>
      <div className="rounded-xl bg-green-light p-3 text-sm text-green">
        Sirf Asli Malik on hai
      </div>
    </div>
  );

  return (
    <div className="page-wrap grid gap-4 px-2 py-4 lg:grid-cols-[256px_minmax(0,1fr)] lg:px-5">
      <aside className="hidden lg:block">{sidebar}</aside>
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-extrabold text-ink">{data?.total ?? 0} listings mile</div>
            <div className="section-subtle">
              {filters.store === 'online'
                ? 'Online Dukaan results'
                : filters.store === 'road'
                  ? `Road Dukaan results${filters.city ? ` • ${filters.city}` : ''}`
                  : 'Saaf results, simple browsing'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="btn-white lg:hidden"
            >
              Filters
            </button>
            <select defaultValue={filters.sort} className="field-select !w-auto !pr-10">
              <option value="newest">Newest</option>
              <option value="price_asc">Price Low</option>
              <option value="price_desc">Price High</option>
            </select>
          </div>
        </div>
        <ListingGrid
          listings={data?.data ?? []}
          loading={isLoading}
          referenceCity={filters.city}
        />
        <div className="mt-4 flex items-center justify-center gap-2">
          <button type="button" className="btn-white">Prev</button>
          <span className="chip active">Page {data?.page ?? 1}</span>
          <button type="button" className="btn-white">Next</button>
        </div>
      </section>

      {mobileFiltersOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setMobileFiltersOpen(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto rounded-t-[24px] bg-white p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" />
            {sidebar}
          </div>
        </div>
      ) : null}
    </div>
  );
}
