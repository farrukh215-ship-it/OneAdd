import { useQuery } from '@tanstack/react-query';
import type { Listing } from '@tgmg/types';
import { api, listingKeys } from '../lib/api';
import { readCachedQuery, writeCachedQuery } from '../lib/query-cache';

export function useListing(id: string) {
  const cacheKey = `listing:${id}`;

  return useQuery({
    queryKey: listingKeys.detail(id),
    enabled: Boolean(id),
    staleTime: 30_000,
    initialData: () => readCachedQuery<Listing | null>(cacheKey, 1000 * 60 * 60) ?? undefined,
    queryFn: async () => {
      try {
        const response = await api.get<Listing>(`/listings/${id}`);
        writeCachedQuery(cacheKey, response.data);
        return response.data;
      } catch {
        return readCachedQuery<Listing | null>(cacheKey, 1000 * 60 * 60) ?? null;
      }
    },
  });
}
