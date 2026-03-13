'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Listing, PaginatedResponse } from '@tgmg/types';
import { ListingGrid } from '../../components/listings/ListingGrid';
import { useCategories } from '../../hooks/useCategories';
import { api } from '../../lib/api';

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
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const filters = useMemo(
    () => ({
      ...initialParams,
      sort: initialParams.sort ?? 'newest',
      radiusKm: initialParams.radiusKm ?? (initialParams.lat && initialParams.lng ? 10 : undefined),
      limit: 20,
    }),
    [initialParams],
  );

  const { data: categories = [] } = useCategories();
  const listings = useInfiniteQuery({
    queryKey: ['listings-infinite', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await api.get<PaginatedResponse<Listing>>('/listings', {
        params: { ...filters, page: pageParam, limit: 20 },
      });
      return response.data;
    },
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
  });

  const mergedListings = useMemo(
    () => listings.data?.pages.flatMap((page) => page.data) ?? [],
    [listings.data?.pages],
  );

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && listings.hasNextPage && !listings.isFetchingNextPage) {
          void listings.fetchNextPage();
        }
      },
      { rootMargin: '240px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [listings]);

  const navigateWith = (patch: Partial<PageFilters>) => {
    const next = {
      ...filters,
      ...patch,
    };
    const query = makeQuery(next);
    router.push(`/listings${query ? `?${query}` : ''}`);
  };

  const refreshListings = async () => {
    setRefreshing(true);
    try {
      await listings.refetch();
    } finally {
      setRefreshing(false);
    }
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

      <button type="button" className="btn-white w-full" onClick={() => navigateWith({
        category: undefined,
        city: undefined,
        store: undefined,
        q: undefined,
        lat: undefined,
        lng: undefined,
        radiusKm: undefined,
        condition: undefined,
        sort: 'newest',
      })}>
        Filters Reset
      </button>
    </div>
  );

  const firstPage = listings.data?.pages[0];

  return (
    <div className="page-wrap grid gap-4 px-2 py-4 lg:grid-cols-[256px_minmax(0,1fr)] lg:px-5">
      <aside className="hidden lg:block">{sidebar}</aside>
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-extrabold text-ink">{firstPage?.total ?? 0} listings mile</div>
            <div className="section-subtle">
              {filters.q ? `Search: "${filters.q}"` : 'Pull to refresh aur infinite scroll active hai'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={refreshListings} className="btn-white">
              {refreshing ? 'Refreshing...' : 'Pull to Refresh'}
            </button>
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

        <ListingGrid
          listings={mergedListings}
          loading={listings.isLoading}
          referenceCity={filters.city}
          referenceLat={filters.lat}
          referenceLng={filters.lng}
        />

        {!listings.isLoading && !mergedListings.length ? (
          <div className="mt-4 rounded-2xl border border-border bg-white p-4">
            <div className="text-base font-bold text-ink">Koi listing nahi mili</div>
            <div className="mt-1 text-sm text-ink2">Search broad karein ya city filter hata dein.</div>
          </div>
        ) : null}

        <div ref={loadMoreRef} className="py-6 text-center text-sm text-ink2">
          {listings.isFetchingNextPage
            ? 'Aur listings load ho rahi hain...'
            : listings.hasNextPage
              ? 'Neeche scroll karo, aur listings aayengi'
              : 'Abhi itni hi listings hain'}
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
