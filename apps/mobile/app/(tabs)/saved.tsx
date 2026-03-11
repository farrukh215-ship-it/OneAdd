import { useRouter } from 'expo-router';
import { FlatList, Text, View } from 'react-native';
import { WideCard } from '../../components/WideCard';
import { fallbackListings } from '../../lib/fallback-data';

export default function SavedScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-bg px-3 pt-4">
      <Text className="mb-3 text-[18px] font-extrabold text-ink">Saved Ads</Text>
      <FlatList
        data={fallbackListings.slice(0, 5)}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <WideCard listing={item} onPress={() => router.push(`/listing/${item.id}`)} />
        )}
      />
    </View>
  );
}
