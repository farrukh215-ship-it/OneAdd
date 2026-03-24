'use client';

import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Listing, PaginatedResponse, SavedSearch, SearchSuggestion } from '@tgmg/types';
import { ListingGrid } from '../../components/listings/ListingGrid';
import { useCategories } from '../../hooks/useCategories';
import { useAuth } from '../../hooks/useAuth';
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
  const [pullStartY, setPullStartY] = useState<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [q, setQ] = useState(initialParams.q ?? '');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [popularSearches, setPopularSearches] = useState<SearchSuggestion[]>([]);
  const { currentUser } = useAuth();

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
  const savedSearches = useQuery({
    queryKey: ['saved-searches', currentUser?.id],
    enabled: Boolean(currentUser),
    queryFn: async () => {
      const response = await api.get<SavedSearch[]>('/search/saved');
      return response.data;
    },
  });
  const recommended = useQuery({
    queryKey: ['recommended-searches', currentUser?.id, filters.city],
    enabled: Boolean(currentUser),
    queryFn: async () => {
      const response = await api.get<{ data: Listing[]; city?: string }>('/search/recommended', {
        params: { city: filters.city, limit: 8 },
      });
      return response.data;
    },
  });
  const saveSearch = useMutation({
    mutationFn: async () => {
      const response = await api.post<SavedSearch>('/search/saved', {
        label: q.trim() || filters.category || filters.city || 'Saved Filter',
        q: q.trim() || undefined,
        category: filters.category,
        city: filters.city,
        condition: filters.condition,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        lat: filters.lat,
        lng: filters.lng,
        radiusKm: filters.radiusKm,
        alertsEnabled: true,
      });
      return response.data;
    },
    onSuccess: () => {
      void savedSearches.refetch();
    },
  });
  const removeSavedSearch = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/search/saved/${id}`);
    },
    onSuccess: () => {
      void savedSearches.refetch();
    },
  });
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
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('tgmg_recent_searches');
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      setRecentSearches(Array.isArray(parsed) ? parsed.slice(0, 6) : []);
    } catch {
      setRecentSearches([]);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const response = await api.get<SearchSuggestion[]>('/search/popular');
        setPopularSearches(response.data);
      } catch {
        setPopularSearches([]);
      }
    })();
  }, []);

  useEffect(() => {
    setQ(initialParams.q ?? '');
  }, [initialParams.q]);

  useEffect(() => {
    const value = q.trim();
    if (value.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const response = await api.get<SearchSuggestion[]>('/search/suggestions', { params: { q: value } });
        setSuggestions(response.data);
      } catch {
        setSuggestions([]);
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    if (!filters.q || typeof window === 'undefined') return;
    setRecentSearches((current) => {
      const next = [filters.q!, ...current.filter((item) => item !== filters.q)].slice(0, 6);
      window.localStorage.setItem('tgmg_recent_searches', JSON.stringify(next));
      return next;
    });
  }, [filters.q]);

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

  const submitSearch = (value: string) => {
    const term = value.trim();
    setSuggestions([]);
    navigateWith({ q: term || undefined, page: undefined });
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
        <div
          onTouchStart={(event) => {
            if (window.scrollY === 0) {
              setPullStartY(event.touches[0]?.clientY ?? null);
            }
          }}
          onTouchMove={(event) => {
            if (pullStartY === null) return;
            const currentY = event.touches[0]?.clientY ?? 0;
            const delta = Math.max(0, currentY - pullStartY);
            setPullDistance(Math.min(delta, 120));
          }}
          onTouchEnd={() => {
            if (pullDistance > 80) {
              void refreshListings();
            }
            setPullStartY(null);
            setPullDistance(0);
          }}
        >
          {recentSearches.length ? (
            <div className="mb-3 flex flex-wrap gap-2">
              {recentSearches.map((item) => (
                <button key={item} type="button" className="chip" onClick={() => navigateWith({ q: item })}>
                  {item}
                </button>
              ))}
              <button
                type="button"
                className="chip"
                onClick={() => {
                  setRecentSearches([]);
                  if (typeof window !== 'undefined') {
                    window.localStorage.removeItem('tgmg_recent_searches');
                  }
                }}
              >
                Clear History
              </button>
            </div>
          ) : null}
          {currentUser && savedSearches.data?.length ? (
            <div className="mb-3 rounded-2xl border border-border bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold text-ink">Saved Filters</div>
                  <div className="text-xs text-ink2">Ek tap me same search dobara kholo.</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {savedSearches.data.slice(0, 6).map((item) => (
                  <div key={item.id} className="flex items-center gap-2 rounded-full border border-border bg-[#F8F9FB] px-3 py-2">
                    <button
                      type="button"
                      className="text-sm font-semibold text-ink"
                      onClick={() =>
                        navigateWith({
                          q: item.q ?? undefined,
                          category: item.category ?? undefined,
                          city: item.city ?? undefined,
                          condition: item.condition ?? undefined,
                          minPrice: item.minPrice ?? undefined,
                          maxPrice: item.maxPrice ?? undefined,
                          lat: item.lat ?? undefined,
                          lng: item.lng ?? undefined,
                          radiusKm: item.radiusKm ?? undefined,
                        })
                      }
                    >
                      {item.label || item.q || item.category || item.city || 'Saved'}
                    </button>
                    <button
                      type="button"
                      className="text-xs font-bold text-red"
                      onClick={() => removeSavedSearch.mutate(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div
            className="overflow-hidden text-center text-xs font-semibold text-ink2 transition-all"
            style={{ maxHeight: pullDistance ? `${pullDistance}px` : '0px', opacity: pullDistance ? 1 : 0 }}
          >
            {refreshing ? 'Refreshing listings...' : pullDistance > 80 ? 'Release to refresh' : 'Pull down to refresh'}
          </div>
          <div className="mb-3 rounded-2xl border border-border bg-white p-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submitSearch(q);
                }}
                className="search-input flex-1"
                placeholder="Search titles, category, city..."
              />
              <div className="flex gap-2">
                {currentUser ? (
                  <button type="button" className="btn-white" onClick={() => saveSearch.mutate()}>
                    {saveSearch.isPending ? 'Saving...' : 'Save Filter'}
                  </button>
                ) : null}
                {q.trim() ? (
                  <button
                    type="button"
                    className="btn-white"
                    onClick={() => {
                      setQ('');
                      submitSearch('');
                    }}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
            {suggestions.length ? (
              <div className="mt-3 rounded-2xl border border-border bg-[#FCFCFD]">
                {suggestions.slice(0, 6).map((item, index) => (
                  <button
                    key={`${item.label}-${index}`}
                    type="button"
                    onClick={() => submitSearch(item.label)}
                    className="flex w-full items-start justify-between border-b border-border px-4 py-3 text-left last:border-b-0"
                  >
                    <div>
                      <div className="text-sm font-bold text-ink">{item.label}</div>
                      <div className="mt-1 text-xs text-ink2">
                        {[item.categoryName, item.city].filter(Boolean).join(' | ') || 'Suggestion'}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-red">Open</span>
                  </button>
                ))}
              </div>
            ) : !q.trim() && popularSearches.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {popularSearches.slice(0, 8).map((item, index) => (
                  <button key={`${item.label}-${index}`} type="button" className="chip" onClick={() => submitSearch(item.label)}>
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {currentUser && recommended.data?.data?.length ? (
            <div className="mb-4 rounded-2xl border border-border bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-extrabold text-ink">For You Feed</div>
                  <div className="text-sm text-ink2">
                    Saved searches, city, aur aapki history ke mutabiq.
                  </div>
                </div>
              </div>
              <ListingGrid
                listings={recommended.data.data.slice(0, 4)}
                referenceCity={recommended.data.city || filters.city}
                referenceLat={filters.lat}
                referenceLng={filters.lng}
              />
            </div>
          ) : null}
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
