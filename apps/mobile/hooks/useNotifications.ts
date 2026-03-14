import { useQuery } from '@tanstack/react-query';
import type { NotificationItem } from '@tgmg/types';
import { api } from '../lib/api';
import { useAuth } from './useAuth';

export function useNotifications() {
  const { currentUser } = useAuth();

  return useQuery({
    queryKey: ['notifications', currentUser?.id],
    enabled: Boolean(currentUser),
    staleTime: 30_000,
    queryFn: async () => {
      const response = await api.get<NotificationItem[]>('/auth/notifications');
      return response.data;
    },
  });
}
