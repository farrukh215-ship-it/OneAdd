import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useNotifications } from '../hooks/useNotifications';

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, unread, unreadCount, isLoading, isRefetching, refetch, markRead, markAllRead } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'contact' | 'saved_update' | 'new_listing'>('all');
  const toMobileHref = (href: string) => href.replace('/listings/', '/listing/');

  const filteredNotifications = useMemo(() => {
    if (filter === 'all') return notifications;
    return notifications.filter((item) => item.type === filter);
  }, [filter, notifications]);

  const newItems = filteredNotifications.filter((item) => unread.some((candidate) => candidate.id === item.id));
  const earlierItems = filteredNotifications.filter((item) => !unread.some((candidate) => candidate.id === item.id));

  const renderSection = (title: string, items: typeof notifications) => {
    if (!items.length) return null;

    return (
      <View className="mt-4">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-xs font-bold uppercase tracking-[1.6px] text-ink3">{title}</Text>
          <Text className="text-[11px] font-semibold text-ink3">{items.length}</Text>
        </View>
        <View className="gap-3">
          {items.map((item) => {
            const isUnread = unread.some((candidate) => candidate.id === item.id);
            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  markRead(item.id);
                  router.push(toMobileHref(item.href) as never);
                }}
                className={`rounded-2xl border p-4 shadow-sm ${isUnread ? 'border-red/20 bg-[#FFF5F4]' : 'border-border bg-white'}`}
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-ink">{item.title}</Text>
                    <Text className="mt-1 text-xs leading-5 text-ink2">{item.body}</Text>
                  </View>
                  <View className={`rounded-full px-2 py-1 ${isUnread ? 'bg-red' : 'bg-[#EEF1F4]'}`}>
                    <Text className={`text-[10px] font-bold ${isUnread ? 'text-white' : 'text-ink2'}`}>
                      {item.type === 'contact' ? 'Lead' : item.type === 'saved_update' ? 'Saved' : 'New'}
                    </Text>
                  </View>
                </View>
                <Text className="mt-3 text-[11px] font-semibold text-ink3">
                  {new Date(item.createdAt).toLocaleString()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor="#E53935" />}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-[20px] font-extrabold text-ink">Notifications</Text>
        <Pressable onPress={() => router.back()}>
          <Text className="text-sm font-semibold text-red">Close</Text>
        </Pressable>
      </View>
      <View className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-[16px] font-extrabold text-ink">Smart Notifications</Text>
            <Text className="mt-1 text-xs text-ink2">Unread: {unreadCount} • Total: {notifications.length}</Text>
          </View>
          <Pressable onPress={markAllRead} className="rounded-full bg-red/10 px-3 py-2">
            <Text className="text-[11px] font-bold text-red">Mark all read</Text>
          </Pressable>
        </View>
        <View className="mt-4 flex-row flex-wrap gap-2">
          {[
            ['all', 'All'],
            ['contact', 'Contacts'],
            ['saved_update', 'Saved'],
            ['new_listing', 'Discovery'],
          ].map(([value, label]) => {
            const active = filter === value;
            return (
              <Pressable
                key={value}
                onPress={() => setFilter(value as typeof filter)}
                className={`rounded-full px-3 py-2 ${active ? 'bg-red' : 'bg-[#F5F6F7]'}`}
              >
                <Text className={`text-[11px] font-bold ${active ? 'text-white' : 'text-ink2'}`}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View className="mt-4 rounded-xl bg-white p-4 shadow-sm">
          <Text className="text-sm text-ink2">Notifications load ho rahi hain...</Text>
        </View>
      ) : filteredNotifications.length ? (
        <>
          {renderSection('New', newItems)}
          {renderSection('Earlier', earlierItems)}
        </>
      ) : (
        <View className="mt-4 rounded-xl bg-white p-4 shadow-sm">
          <Text className="text-sm text-ink2">Abhi koi notification nahi hai.</Text>
        </View>
      )}
    </ScrollView>
  );
}
