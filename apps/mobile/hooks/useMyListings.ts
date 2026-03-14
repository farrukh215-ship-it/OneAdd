import { useQuery } from '@tanstack/react-query';
import type { Listing, PaginatedResponse } from '@tgmg/types';
import { api } from '../lib/api';
import { readCachedQuery, writeCachedQuery } from '../lib/query-cache';
import { useAuth } from './useAuth';

export function useMyListings() {
  const { currentUser } = useAuth();

  return useQuery({
    queryKey: ['my-listings', currentUser?.id],
    enabled: Boolean(currentUser),
    staleTime: 15_000,
    initialData: () =>
      currentUser ? readCachedQuery<PaginatedResponse<Listing>>(`my-listings:${currentUser.id}`, 1000 * 60 * 15) : undefined,
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Listing>>('/listings/my', {
        params: { page: 1, limit: 20 },
      });
      if (currentUser) {
        writeCachedQuery(`my-listings:${currentUser.id}`, response.data);
      }
      return response.data;
    },
  });
}
