import { useQuery } from '@tanstack/react-query';
import type { Listing, PaginatedResponse } from '@tgmg/types';
import { api } from '../lib/api';
import { useAuth } from './useAuth';

export function useMyListings() {
  const { currentUser } = useAuth();

  return useQuery({
    queryKey: ['my-listings', currentUser?.id],
    enabled: Boolean(currentUser),
    staleTime: 15_000,
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Listing>>('/listings/my', {
        params: { page: 1, limit: 20 },
      });
      return response.data;
    },
  });
}
