import { useQuery } from '@tanstack/react-query';
import type { Listing } from '@tgmg/types';
import { api, listingKeys } from '../lib/api';

export function useListing(id: string) {
  return useQuery({
    queryKey: listingKeys.detail(id),
    enabled: Boolean(id),
    staleTime: 30_000,
    queryFn: async () => {
      try {
        const response = await api.get<Listing>(`/listings/${id}`);
        return response.data;
      } catch {
        return null;
      }
    },
  });
}
