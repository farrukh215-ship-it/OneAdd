import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { storage } from '../lib/storage';

export function useAuth() {
  const queryClient = useQueryClient();

  const currentUser = useQuery({
    queryKey: ['current-user'],
    staleTime: 30_000,
    queryFn: async () => {
      const token = storage.getString('tgmg_token');
      if (!token) return null;

      try {
        const response = await api.get('/auth/me');
        return response.data;
      } catch {
        return null;
      }
    },
  });

  const setToken = (token: string) => {
    storage.set('tgmg_token', token);
    void queryClient.invalidateQueries({ queryKey: ['current-user'] });
  };

  const logout = () => {
    storage.remove('tgmg_token');
    void queryClient.invalidateQueries({ queryKey: ['current-user'] });
  };

  return {
    currentUser: currentUser.data,
    isLoading: currentUser.isLoading,
    setToken,
    logout,
  };
}
