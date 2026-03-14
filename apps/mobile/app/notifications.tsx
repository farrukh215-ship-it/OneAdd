import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useNotifications } from '../hooks/useNotifications';

export default function NotificationsScreen() {
  const router = useRouter();
  const { data: notifications = [], isLoading } = useNotifications();
  const toMobileHref = (href: string) => href.replace('/listings/', '/listing/');

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
      <View className="flex-row items-center justify-between">
        <Text className="text-[20px] font-extrabold text-ink">Notifications</Text>
        <Pressable onPress={() => router.back()}>
          <Text className="text-sm font-semibold text-red">Close</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View className="mt-4 rounded-xl bg-white p-4 shadow-sm">
          <Text className="text-sm text-ink2">Notifications load ho rahi hain...</Text>
        </View>
      ) : notifications.length ? (
        <View className="mt-4 gap-3">
          {notifications.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => router.push(toMobileHref(item.href) as never)}
              className="rounded-xl bg-white p-4 shadow-sm"
            >
              <Text className="text-sm font-bold text-ink">{item.title}</Text>
              <Text className="mt-1 text-xs text-ink2">{item.body}</Text>
              <Text className="mt-2 text-[11px] font-semibold text-red">
                {new Date(item.createdAt).toLocaleString()}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View className="mt-4 rounded-xl bg-white p-4 shadow-sm">
          <Text className="text-sm text-ink2">Abhi koi notification nahi hai.</Text>
        </View>
      )}
    </ScrollView>
  );
}
