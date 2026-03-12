import { useQuery } from '@tanstack/react-query';
import type { Listing, PaginatedResponse } from '@tgmg/types';
import { api, listingKeys } from '../lib/api';
import { fallbackListings } from '../lib/fallback-data';

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
  return useQuery({
    queryKey: listingKeys.list(filters),
    staleTime: 30_000,
    queryFn: async () => {
      try {
        const response = await api.get<PaginatedResponse<Listing>>('/listings', {
          params: filters,
        });
        return response.data;
      } catch {
        return {
          data: fallbackListings,
          total: fallbackListings.length,
          page: filters.page ?? 1,
          totalPages: 1,
        };
      }
    },
  });
}
