import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';

export default function ProfileScreen() {
  const router = useRouter();
  const { currentUser, logout } = useAuth();

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16 }}>
      <Text className="text-[18px] font-extrabold text-ink">Mera Profile</Text>

      <View className="mt-4 rounded-xl bg-white p-4 shadow-sm">
        <Text className="text-base font-bold text-ink">{currentUser?.name || 'Guest User'}</Text>
        <Text className="mt-1 text-sm text-ink2">{currentUser?.phone || '+92**********'}</Text>
        <Text className="mt-1 text-sm text-ink2">
          {[currentUser?.city, currentUser?.area].filter(Boolean).join(', ') || 'Shehar abhi set nahi'}
        </Text>
      </View>

      <View className="mt-4 gap-3">
        <Pressable onPress={() => router.push('/post/category')} className="rounded-xl bg-red px-4 py-3">
          <Text className="text-center font-bold text-white">+ Ad Post Karo</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/(tabs)/saved')} className="rounded-xl bg-white px-4 py-3">
          <Text className="text-center font-bold text-ink">Saved Ads</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/auth/phone')} className="rounded-xl bg-white px-4 py-3">
          <Text className="text-center font-bold text-ink">
            {currentUser ? 'Switch Account' : 'Login / Sign Up'}
          </Text>
        </Pressable>
        {currentUser ? (
          <Pressable onPress={logout} className="rounded-xl border border-border bg-white px-4 py-3">
            <Text className="text-center font-bold text-ink2">Logout</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}
