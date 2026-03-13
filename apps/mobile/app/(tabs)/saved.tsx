import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { Listing } from '@tgmg/types';
import { FlatList, Text, View } from 'react-native';
import { WideCard } from '../../components/WideCard';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';

export default function SavedScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { data: savedListings = [], isLoading } = useQuery({
    queryKey: ['saved-listings'],
    enabled: Boolean(currentUser),
    queryFn: async () => {
      const response = await api.get<Listing[] | { data?: Listing[] }>('/listings/saved');
      return Array.isArray(response.data) ? response.data : response.data?.data ?? [];
    },
  });

  return (
    <View className="flex-1 bg-bg px-3 pt-4">
      <Text className="mb-3 text-[18px] font-extrabold text-ink">Saved Ads</Text>
      {!currentUser ? (
        <View className="rounded-xl bg-white px-4 py-4">
          <Text className="text-sm text-ink2">Saved ads dekhne ke liye login karein.</Text>
        </View>
      ) : isLoading ? (
        <View className="rounded-xl bg-white px-4 py-4">
          <Text className="text-sm text-ink2">Saved ads load ho rahe hain...</Text>
        </View>
      ) : !savedListings.length ? (
        <View className="rounded-xl bg-white px-4 py-4">
          <Text className="text-sm text-ink2">Abhi koi saved ad nahi hai.</Text>
        </View>
      ) : (
        <FlatList
          data={savedListings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WideCard listing={item} onPress={() => router.push(`/listing/${item.id}`)} />
          )}
        />
      )}
    </View>
  );
}
