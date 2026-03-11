import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ProgressHeader } from '../../components/ProgressHeader';

export default function PostDetailsScreen() {
  const router = useRouter();
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<'NEW' | 'USED'>('USED');

  const valid = useMemo(
    () => title.trim().length >= 10 && description.trim().length >= 20 && Number(price) > 0,
    [description, price, title],
  );

  return (
    <View className="flex-1 bg-bg">
      <ProgressHeader step={2} title="Ad Ki Tafseel" />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text className="mb-2 text-sm font-semibold text-ink">Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          className="rounded-xl border border-border bg-white px-4 py-3 text-ink"
          placeholder="Product ka title likhein"
        />
        <Text className="mt-1 text-right text-xs text-ink3">{title.length}/100</Text>

        <Text className="mb-2 mt-4 text-sm font-semibold text-ink">Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          className="min-h-[120px] rounded-xl border border-border bg-white px-4 py-3 text-ink"
          placeholder="Product ki poori tafseel dein"
          multiline
          textAlignVertical="top"
        />
        <Text className="mt-1 text-right text-xs text-ink3">{description.length}/1000</Text>

        <Text className="mb-2 mt-4 text-sm font-semibold text-ink">Price</Text>
        <View className="flex-row overflow-hidden rounded-xl border border-border bg-white">
          <View className="items-center justify-center border-r border-border px-4">
            <Text className="font-semibold text-ink2">PKR</Text>
          </View>
          <TextInput
            value={price}
            onChangeText={setPrice}
            className="flex-1 px-4 py-3 text-ink"
            placeholder="Price daalein"
            keyboardType="numeric"
          />
        </View>

        <Text className="mb-2 mt-4 text-sm font-semibold text-ink">Condition</Text>
        <View className="flex-row gap-3">
          {[
            { value: 'NEW', label: 'Naya ✨' },
            { value: 'USED', label: 'Purana 👍' },
          ].map((item) => (
            <Pressable
              key={item.value}
              onPress={() => setCondition(item.value as 'NEW' | 'USED')}
              className={`flex-1 rounded-xl px-4 py-4 ${
                condition === item.value ? 'bg-red' : 'border border-border bg-white'
              }`}
            >
              <Text className={`text-center font-semibold ${condition === item.value ? 'text-white' : 'text-ink2'}`}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          disabled={!valid}
          onPress={() =>
            router.push({
              pathname: '/post/photos',
              params: { categoryId, title, description, price, condition },
            })
          }
          className={`mt-6 rounded-xl py-4 ${valid ? 'bg-red' : 'bg-border'}`}
        >
          <Text className="text-center text-base font-bold text-white">Aage Barhein →</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
