import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useListing } from '../../../hooks/useListing';
import { api } from '../../../lib/api';

export default function EditListingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: listing, isLoading } = useListing(id);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<'NEW' | 'USED'>('USED');

  useEffect(() => {
    if (!listing) return;
    setTitle(listing.title);
    setDescription(listing.description);
    setPrice(String(listing.price));
    setCondition(listing.condition);
  }, [listing]);

  const updateListing = useMutation({
    mutationFn: async () => {
      const response = await api.patch(`/listings/${id}`, {
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        condition,
      });
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['listings'] });
      void queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      void queryClient.invalidateQueries({ queryKey: ['listing-dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['listings', 'detail', id] });
      router.replace(`/listing/${id}`);
    },
    onError: () => {
      Alert.alert('Masla', 'Listing update nahi hui. Dobara try karein.');
    },
  });

  const valid = useMemo(
    () => title.trim().length >= 10 && description.trim().length >= 20 && Number(price) > 0,
    [description, price, title],
  );

  if (isLoading || !listing) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="text-sm text-ink2">Listing load ho rahi hai...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
      <View className="flex-row items-center justify-between">
        <Text className="text-[20px] font-extrabold text-ink">Edit Listing</Text>
        <Pressable onPress={() => router.back()}>
          <Text className="text-sm font-semibold text-red">Cancel</Text>
        </Pressable>
      </View>

      <Text className="mb-2 mt-5 text-sm font-semibold text-ink">Title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        className="rounded-xl border border-border bg-white px-4 py-3 text-ink"
        placeholder="Listing title"
      />

      <Text className="mb-2 mt-4 text-sm font-semibold text-ink">Description</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        multiline
        textAlignVertical="top"
        className="min-h-[140px] rounded-xl border border-border bg-white px-4 py-3 text-ink"
        placeholder="Listing details"
      />

      <Text className="mb-2 mt-4 text-sm font-semibold text-ink">Price</Text>
      <TextInput
        value={price}
        onChangeText={setPrice}
        className="rounded-xl border border-border bg-white px-4 py-3 text-ink"
        placeholder="Price"
        keyboardType="numeric"
      />

      <Text className="mb-2 mt-4 text-sm font-semibold text-ink">Condition</Text>
      <View className="flex-row gap-3">
        {[
          { value: 'NEW', label: 'Naya' },
          { value: 'USED', label: 'Purana' },
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
        disabled={updateListing.isPending || !valid}
        onPress={() => updateListing.mutate()}
        className={`mt-6 rounded-xl py-4 ${updateListing.isPending || !valid ? 'bg-border' : 'bg-red'}`}
      >
        <Text className="text-center text-base font-bold text-white">
          {updateListing.isPending ? 'Update ho rahi hai...' : 'Update Listing'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
