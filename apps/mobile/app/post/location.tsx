import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ProgressHeader } from '../../components/ProgressHeader';
import { api } from '../../lib/api';

const cities = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad'];

export default function PostLocationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string>>();
  const [city, setCity] = useState(cities[0]);
  const [area, setArea] = useState('');

  const createListing = useMutation({
    mutationFn: async () => {
      const payload = {
        title: params.title,
        description: params.description,
        price: Number(params.price),
        categoryId: params.categoryId,
        images: params.images ? JSON.parse(params.images) : [],
        condition: params.condition,
        city,
        area: area.trim() || undefined,
      };
      const response = await api.post('/listings', payload);
      return response.data;
    },
    onSuccess: (data) => {
      Alert.alert('Ad lag gayi', 'Aapki listing publish ho gayi.');
      router.replace(`/listing/${data.id ?? data.data?.id}`);
    },
  });

  return (
    <View className="flex-1 bg-bg">
      <ProgressHeader step={4} title="Location Set Karein" />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text className="mb-2 text-sm font-semibold text-ink">City</Text>
        <View className="flex-row flex-wrap gap-2">
          {cities.map((item) => (
            <Pressable
              key={item}
              onPress={() => setCity(item)}
              className={`rounded-full px-4 py-3 ${city === item ? 'bg-red' : 'border border-border bg-white'}`}
            >
              <Text className={`font-semibold ${city === item ? 'text-white' : 'text-ink2'}`}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <Text className="mb-2 mt-4 text-sm font-semibold text-ink">Area</Text>
        <TextInput
          value={area}
          onChangeText={setArea}
          className="rounded-xl border border-border bg-white px-4 py-3 text-ink"
          placeholder="Area optional hai"
        />

        <View className="mt-5 rounded-xl bg-[#FFF8E1] p-4">
          <Text className="text-sm font-semibold text-[#8A6D1D]">
            ⚠️ Ek category mein sirf ek ad
          </Text>
        </View>

        <Pressable
          disabled={createListing.isPending}
          onPress={() => createListing.mutate()}
          className="mt-6 rounded-xl bg-red py-4"
        >
          <Text className="text-center text-base font-bold text-white">
            {createListing.isPending ? 'Ad lag rahi hai...' : 'Ad Lagao ✓'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
