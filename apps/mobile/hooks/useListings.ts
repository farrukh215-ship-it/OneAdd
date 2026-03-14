import { useQuery } from '@tanstack/react-query';
import type { Listing, PaginatedResponse } from '@tgmg/types';
import { api, listingKeys } from '../lib/api';
import { readCachedQuery, writeCachedQuery } from '../lib/query-cache';

export type ListingsFilters = {
  q?: string;
  category?: string;
  city?: string;
  store?: string;
  storeType?: 'ONLINE' | 'ROAD';
  lat?: number;
  lng?: number;
  radiusKm?: number;
  minPrice?: number;
  maxPrice?: number;
  condition?: 'NEW' | 'USED';
  sort?: string;
  page?: number;
  limit?: number;
};

export function useListings(filters: ListingsFilters) {
  const cacheKey = `listings:${JSON.stringify(filters)}`;

  return useQuery({
    queryKey: listingKeys.list(filters),
    staleTime: 30_000,
    initialData: () =>
      readCachedQuery<PaginatedResponse<Listing>>(cacheKey, 1000 * 60 * 30) ?? undefined,
    queryFn: async () => {
      try {
        const response = await api.get<PaginatedResponse<Listing>>('/listings', {
          params: filters,
        });
        writeCachedQuery(cacheKey, response.data);
        return response.data;
      } catch {
        return readCachedQuery<PaginatedResponse<Listing>>(cacheKey, 1000 * 60 * 30) ?? {
          data: [],
          total: 0,
          page: filters.page ?? 1,
          totalPages: 0,
        };
      }
    },
  });
}
