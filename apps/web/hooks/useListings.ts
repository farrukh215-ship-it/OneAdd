'use client';

import { useQuery } from '@tanstack/react-query';
import type { Listing, PaginatedResponse } from '@tgmg/types';
import { api } from '../lib/api';

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
      const response = await api.get<PaginatedResponse<Listing>>('/listings', {
        params: filters,
      });
      return response.data;
    },
  });
}
