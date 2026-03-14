import { useQuery } from '@tanstack/react-query';
import type { NotificationItem } from '@tgmg/types';
import { api } from '../lib/api';
import { getUnreadNotifications, markNotificationRead, markNotificationsRead } from '../lib/mobile-notifications';
import { useAuth } from './useAuth';

export function useNotifications() {
  const { currentUser } = useAuth();

  const query = useQuery({
    queryKey: ['notifications', currentUser?.id],
    enabled: Boolean(currentUser),
    staleTime: 30_000,
    queryFn: async () => {
      const response = await api.get<NotificationItem[]>('/auth/notifications');
      return response.data;
    },
  });

  const notifications = query.data ?? [];
  const unread = getUnreadNotifications(notifications);

  return {
    ...query,
    notifications,
    unread,
    unreadCount: unread.length,
    markRead: (id: string) => markNotificationRead(id),
    markAllRead: () => markNotificationsRead(notifications.map((item) => item.id)),
  };
}
