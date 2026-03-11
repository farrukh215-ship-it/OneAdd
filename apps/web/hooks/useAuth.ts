'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

type CurrentUser = {
  id: string;
  phone: string;
  name?: string | null;
  city?: string | null;
  area?: string | null;
  verified: boolean;
  createdAt: string;
};

export function useAuth() {
  const queryClient = useQueryClient();

  const currentUser = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const token =
        typeof window !== 'undefined' ? window.localStorage.getItem('tgmg_token') : null;

      if (!token) return null;

      try {
        const response = await api.get<CurrentUser>('/auth/me');
        return response.data;
      } catch {
        return null;
      }
    },
  });

  const setToken = (token: string) => {
    window.localStorage.setItem('tgmg_token', token);
    void queryClient.invalidateQueries({ queryKey: ['current-user'] });
  };

  const logout = () => {
    window.localStorage.removeItem('tgmg_token');
    void queryClient.invalidateQueries({ queryKey: ['current-user'] });
  };

  return {
    currentUser: currentUser.data,
    isLoading: currentUser.isLoading,
    setToken,
    logout,
  };
}
