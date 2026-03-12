'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
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

const TOKEN_KEY = 'tgmg_token';
const TOKEN_SET_AT_KEY = 'tgmg_token_set_at';
const LAST_ACTIVE_KEY = 'tgmg_last_active_at';
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export function useAuth() {
  const queryClient = useQueryClient();

  const currentUser = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const token =
        typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null;

      if (!token) return null;

      if (typeof window !== 'undefined') {
        const now = Date.now();
        const lastActiveRaw = window.localStorage.getItem(LAST_ACTIVE_KEY);
        const lastActive = lastActiveRaw ? Number(lastActiveRaw) : 0;

        if (!lastActive || now - lastActive > THREE_DAYS_MS) {
          window.localStorage.removeItem(TOKEN_KEY);
          window.localStorage.removeItem(TOKEN_SET_AT_KEY);
          window.localStorage.removeItem(LAST_ACTIVE_KEY);
          return null;
        }

        window.localStorage.setItem(LAST_ACTIVE_KEY, String(now));
      }

      try {
        const response = await api.get<CurrentUser>('/auth/me');
        return response.data;
      } catch {
        return null;
      }
    },
  });

  useEffect(() => {
    const updateActivity = () =>
      window.localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
    window.addEventListener('click', updateActivity, { passive: true });
    window.addEventListener('keydown', updateActivity, { passive: true });
    return () => {
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('keydown', updateActivity);
    };
  }, []);

  const setToken = (token: string) => {
    const now = Date.now();
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(TOKEN_SET_AT_KEY, String(now));
    window.localStorage.setItem(LAST_ACTIVE_KEY, String(now));
    void queryClient.invalidateQueries({ queryKey: ['current-user'] });
  };

  const logout = () => {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(TOKEN_SET_AT_KEY);
    window.localStorage.removeItem(LAST_ACTIVE_KEY);
    void queryClient.invalidateQueries({ queryKey: ['current-user'] });
  };

  return {
    currentUser: currentUser.data,
    isLoading: currentUser.isLoading,
    setToken,
    logout,
  };
}
