'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ListingGrid } from '../../components/listings/ListingGrid';
import { useCategories } from '../../hooks/useCategories';
import { useListings } from '../../hooks/useListings';

const cities = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad'];

type PageFilters = {
  category?: string;
  city?: string;
  store?: string;
  q?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  minPrice?: number;
  maxPrice?: number;
  condition?: 'NEW' | 'USED';
  sort?: string;
  page?: number;
};

function makeQuery(filters: PageFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  return params.toString();
}

export function ListingsPageClient({
  initialParams,
}: {
  initialParams: PageFilters;
}) {
  const router = useRouter();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const filters = useMemo(
    () => ({
      ...initialParams,
      page: initialParams.page ?? 1,
      limit: 20,
      sort: initialParams.sort ?? 'newest',
      radiusKm: initialParams.radiusKm ?? (initialParams.lat && initialParams.lng ? 10 : undefined),
    }),
    [initialParams],
  );
  const { data: categories = [] } = useCategories();
  const { data, isLoading } = useListings(filters);

  const navigateWith = (patch: Partial<PageFilters>) => {
    const next = {
      ...filters,
      ...patch,
      page: 1,
    };
    const query = makeQuery(next);
    router.push(`/listings${query ? `?${query}` : ''}`);
  };

  const sidebar = (
    <div className="surface sticky top-[76px] space-y-4 p-4">
      <div>
        <div className="mb-2 text-sm font-bold">Categories</div>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => navigateWith({ category: undefined })}
            className={`block w-full rounded-xl px-3 py-2 text-left text-sm ${
              !filters.category ? 'bg-red-light text-red' : 'bg-[#F8F9FB] text-ink2'
            }`}
          >
            Sab
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => navigateWith({ category: category.slug })}
              className={`block w-full rounded-xl px-3 py-2 text-left text-sm ${
                filters.category === category.slug ? 'bg-red-light text-red' : 'bg-[#F8F9FB] text-ink2'
              }`}
            >
              {category.icon} {category.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-bold">Dukaan type</div>
        <div className="flex gap-2">
          <button type="button" onClick={() => navigateWith({ store: 'online' })} className={`chip ${filters.store === 'online' ? 'active' : ''}`}>
            Online
          </button>
          <button type="button" onClick={() => navigateWith({ store: 'road' })} className={`chip ${filters.store === 'road' ? 'active' : ''}`}>
            Road
          </button>
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-bold">City</div>
        <select
          value={filters.city || ''}
          className="field-select"
          onChange={(event) => navigateWith({ city: event.target.value || undefined })}
        >
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
          <button type="button" onClick={() => navigateWith({ condition: 'NEW' })} className={`chip ${filters.condition === 'NEW' ? 'active' : ''}`}>New</button>
          <button type="button" onClick={() => navigateWith({ condition: 'USED' })} className={`chip ${filters.condition === 'USED' ? 'active' : ''}`}>Used</button>
        </div>
      </div>
      <div className="rounded-xl bg-green-light p-3 text-sm text-green">
        Sirf Asli Malik on hai
      </div>
      {typeof filters.lat === 'number' && typeof filters.lng === 'number' ? (
        <div className="rounded-xl border border-red/20 bg-red-light p-3 text-xs font-semibold text-red">
          Rule active: Within {filters.radiusKm ?? 10} km listings pehle show hongi.
        </div>
      ) : null}
      <button type="button" className="btn-white w-full" onClick={() => router.push(`/listings?${makeQuery({
        ...filters,
        category: undefined,
        city: undefined,
        store: undefined,
        q: undefined,
        lat: undefined,
        lng: undefined,
        radiusKm: undefined,
        condition: undefined,
        sort: 'newest',
      })}`)}>
        Filters Reset
      </button>
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
              {filters.q
                ? `Search: "${filters.q}"`
                : filters.store === 'online'
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
            <select
              value={filters.sort}
              className="field-select !w-auto !pr-10"
              onChange={(event) => navigateWith({ sort: event.target.value })}
            >
              <option value="newest">Newest</option>
              <option value="price_asc">Price Low</option>
              <option value="price_desc">Price High</option>
            </select>
          </div>
        </div>

        {typeof filters.lat === 'number' && typeof filters.lng === 'number' ? (
          <div className="mb-3 rounded-xl border border-red/20 bg-red-light px-3 py-2 text-sm font-semibold text-red">
            Mere paas mode: sirf nearby (within {filters.radiusKm ?? 10} km) items pehle rank hongi.
          </div>
        ) : null}

        <ListingGrid
          listings={data?.data ?? []}
          loading={isLoading}
          referenceCity={filters.city}
          referenceLat={filters.lat}
          referenceLng={filters.lng}
        />

        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            type="button"
            className="btn-white"
            onClick={() => navigateWith({ page: Math.max(1, (filters.page ?? 1) - 1) })}
            disabled={(filters.page ?? 1) <= 1}
          >
            Prev
          </button>
          <span className="chip active">Page {data?.page ?? 1}</span>
          <button
            type="button"
            className="btn-white"
            onClick={() => navigateWith({ page: (filters.page ?? 1) + 1 })}
            disabled={(data?.page ?? 1) >= (data?.totalPages ?? 1)}
          >
            Next
          </button>
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
