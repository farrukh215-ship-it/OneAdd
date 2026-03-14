import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { readCachedQuery, writeCachedQuery } from '../lib/query-cache';
import { storage } from '../lib/storage';

export function useAuth() {
  const queryClient = useQueryClient();

  const currentUser = useQuery({
    queryKey: ['current-user'],
    staleTime: 30_000,
    initialData: () => readCachedQuery('current-user', 1000 * 60 * 60 * 24) ?? null,
    queryFn: async () => {
      const token = storage.getString('tgmg_token');
      if (!token) return null;

      try {
        const response = await api.get('/auth/me');
        writeCachedQuery('current-user', response.data);
        return response.data;
      } catch {
        return readCachedQuery('current-user', 1000 * 60 * 60 * 24) ?? null;
      }
    },
  });

  const setToken = (token: string) => {
    storage.set('tgmg_token', token);
    void queryClient.invalidateQueries({ queryKey: ['current-user'] });
  };

  const logout = () => {
    storage.remove('tgmg_token');
    storage.remove('tgmg_query_cache:current-user');
    void queryClient.invalidateQueries({ queryKey: ['current-user'] });
  };

  return {
    currentUser: currentUser.data,
    isLoading: currentUser.isLoading,
    setToken,
    logout,
  };
}
