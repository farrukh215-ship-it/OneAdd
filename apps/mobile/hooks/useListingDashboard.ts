import { useQuery } from '@tanstack/react-query';
import type { ListingDashboard } from '@tgmg/types';
import { api } from '../lib/api';
import { readCachedQuery, writeCachedQuery } from '../lib/query-cache';
import { useAuth } from './useAuth';

export function useListingDashboard() {
  const { currentUser } = useAuth();

  return useQuery({
    queryKey: ['listing-dashboard', currentUser?.id],
    enabled: Boolean(currentUser),
    staleTime: 30_000,
    initialData: () =>
      currentUser ? readCachedQuery<ListingDashboard>(`listing-dashboard:${currentUser.id}`, 1000 * 60 * 15) : undefined,
    queryFn: async () => {
      const response = await api.get<ListingDashboard>('/listings/my/dashboard');
      if (currentUser) {
        writeCachedQuery(`listing-dashboard:${currentUser.id}`, response.data);
      }
      return response.data;
    },
  });
}
