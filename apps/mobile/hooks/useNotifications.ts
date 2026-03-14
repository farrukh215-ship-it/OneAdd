import { useQuery } from '@tanstack/react-query';
import type { NotificationItem } from '@tgmg/types';
import { api } from '../lib/api';
import { readCachedQuery, writeCachedQuery } from '../lib/query-cache';
import { useAuth } from './useAuth';

export function useNotifications() {
  const { currentUser } = useAuth();

  const query = useQuery({
    queryKey: ['notifications', currentUser?.id],
    enabled: Boolean(currentUser),
    staleTime: 30_000,
    initialData: () =>
      currentUser ? readCachedQuery<NotificationItem[]>(`notifications:${currentUser.id}`, 1000 * 60 * 10) : undefined,
    queryFn: async () => {
      const response = await api.get<NotificationItem[]>('/auth/notifications');
      if (currentUser) {
        writeCachedQuery(`notifications:${currentUser.id}`, response.data);
      }
      return response.data;
    },
  });

  const notifications = query.data ?? [];
  const unread = notifications.filter((item) => !item.readAt);

  return {
    ...query,
    notifications,
    unread,
    unreadCount: unread.length,
    markRead: async (id: string) => {
      await api.post('/auth/notifications/read', { notificationId: id });
      const next = notifications.map((item) =>
        item.id === id ? { ...item, readAt: new Date().toISOString() } : item,
      );
      if (currentUser) {
        writeCachedQuery(`notifications:${currentUser.id}`, next);
      }
      await query.refetch();
    },
    markAllRead: async () => {
      await api.post('/auth/notifications/read-all');
      const next = notifications.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() }));
      if (currentUser) {
        writeCachedQuery(`notifications:${currentUser.id}`, next);
      }
      await query.refetch();
    },
  };
}
