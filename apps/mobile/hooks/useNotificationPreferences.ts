import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NotificationPreferences } from '@tgmg/types';
import { api } from '../lib/api';
import { useAuth } from './useAuth';

export function useNotificationPreferences() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notification-preferences', currentUser?.id],
    enabled: Boolean(currentUser),
    staleTime: 60_000,
    queryFn: async () => {
      const response = await api.get<NotificationPreferences>('/auth/notification-preferences');
      return response.data;
    },
  });

  const update = useMutation({
    mutationFn: async (payload: Partial<NotificationPreferences>) => {
      const response = await api.post<NotificationPreferences>('/auth/notification-preferences', payload);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-preferences', currentUser?.id] });
    },
  });

  return {
    ...query,
    preferences: query.data,
    update: (payload: Partial<NotificationPreferences>) => update.mutateAsync(payload),
    isUpdating: update.isPending,
  };
}
