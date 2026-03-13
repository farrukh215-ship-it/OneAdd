'use client';

import { useQuery } from '@tanstack/react-query';
import type { Listing } from '@tgmg/types';
import { api } from '../lib/api';

export function useListing(id: string) {
  return useQuery({
    queryKey: ['listing', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await api.get<Listing>(`/listings/${id}`);
      return response.data;
    },
  });
}
