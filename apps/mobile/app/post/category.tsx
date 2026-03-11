import { useRouter } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';
import { ProgressHeader } from '../../components/ProgressHeader';
import { useCategories } from '../../hooks/useCategories';

export default function PostCategoryScreen() {
  const router = useRouter();
  const { data: categories = [] } = useCategories();

  return (
    <View className="flex-1 bg-bg">
      <ProgressHeader step={1} title="Category Select Karein" />
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={{ padding: 16 }}
        columnWrapperStyle={{ gap: 12 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/post/details', params: { categoryId: item.id } })}
            className="mb-3 flex-1 items-center rounded-xl bg-white p-4 shadow-sm"
          >
            <Text className="text-[28px]">{item.icon}</Text>
            <Text className="mt-2 text-center text-[12px] font-semibold text-ink">{item.name}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
