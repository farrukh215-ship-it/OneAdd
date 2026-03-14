import { useQuery } from '@tanstack/react-query';
import type { ListingDashboard } from '@tgmg/types';
import { api } from '../lib/api';
import { useAuth } from './useAuth';

export function useListingDashboard() {
  const { currentUser } = useAuth();

  return useQuery({
    queryKey: ['listing-dashboard', currentUser?.id],
    enabled: Boolean(currentUser),
    staleTime: 30_000,
    queryFn: async () => {
      const response = await api.get<ListingDashboard>('/listings/my/dashboard');
      return response.data;
    },
  });
}
