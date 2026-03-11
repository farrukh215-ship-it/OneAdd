'use client';

import { useQuery } from '@tanstack/react-query';
import type { Listing } from '@tgmg/types';
import { api } from '../lib/api';
import { fallbackListings } from '../lib/fallback-data';

export function useListing(id: string) {
  return useQuery({
    queryKey: ['listing', id],
    enabled: Boolean(id),
    queryFn: async () => {
      try {
        const response = await api.get<Listing>(`/listings/${id}`);
        return response.data;
      } catch {
        return fallbackListings[0]!;
      }
    },
  });
}
