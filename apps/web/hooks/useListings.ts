'use client';

import { useQuery } from '@tanstack/react-query';
import type { Listing, PaginatedResponse } from '@tgmg/types';
import { api } from '../lib/api';
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
    queryKey: ['listings', filters],
    queryFn: async () => {
      try {
        const response = await api.get<PaginatedResponse<Listing>>('/listings', {
          params: filters,
        });
        return response.data;
      } catch {
        const filtered = fallbackListings.filter((listing) => {
          if (filters.category && listing.category.slug !== filters.category) return false;
          if (filters.city && listing.city.toLowerCase() !== filters.city.toLowerCase()) return false;
          return true;
        });

        return {
          data: filtered,
          total: filtered.length,
          page: filters.page ?? 1,
          totalPages: 1,
        };
      }
    },
  });
}
