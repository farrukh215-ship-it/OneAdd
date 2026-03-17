import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import {
  getCategoryDefinitionBySlug,
  getMinimumPriceForListing,
  getSubcategoryDefinition,
  type ListingAttributes,
  type ListingFeatureDefinition,
} from '@tgmg/types';
import { useListing } from '../../../hooks/useListing';
import { api } from '../../../lib/api';

function normalizeFeatureValue(
  feature: ListingFeatureDefinition,
  value: string | boolean | undefined,
): string | number | boolean | undefined {
  if (feature.type === 'boolean') {
    return typeof value === 'boolean' ? value : undefined;
  }

  const text = String(value ?? '').trim();
  if (!text) return undefined;

  if (feature.type === 'number') {
    const numeric = Number(text);
    if (!Number.isFinite(numeric)) return undefined;
    return numeric;
  }

  return text;
}

export default function EditListingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: listing, isLoading } = useListing(id);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<'NEW' | 'USED'>('USED');
  const [subcategorySlug, setSubcategorySlug] = useState('');
  const [attributes, setAttributes] = useState<Record<string, string | boolean>>({});

  const categoryDefinition = getCategoryDefinitionBySlug(listing?.category?.slug);
  const selectedSubcategory = getSubcategoryDefinition(listing?.category?.slug, subcategorySlug);
  const minimumPrice = getMinimumPriceForListing(listing?.category?.slug, subcategorySlug);

  useEffect(() => {
    if (!listing) return;
    setTitle(listing.title);
    setDescription(listing.description);
    setPrice(String(listing.price));
    setCondition(listing.condition);
    setSubcategorySlug(listing.subcategorySlug ?? '');
    const nextAttributes = Object.entries((listing.attributes ?? {}) as Record<string, string | number | boolean>).reduce<
      Record<string, string | boolean>
    >((acc, [key, value]) => {
      acc[key] = typeof value === 'boolean' ? value : String(value);
      return acc;
    }, {});
    setAttributes(nextAttributes);
  }, [listing]);

  const normalizedAttributes = useMemo<ListingAttributes>(() => {
    if (!selectedSubcategory) return {};
    return selectedSubcategory.features.reduce<ListingAttributes>((acc, feature) => {
      const value = normalizeFeatureValue(feature, attributes[feature.key]);
      if (value !== undefined) acc[feature.key] = value;
      return acc;
    }, {});
  }, [attributes, selectedSubcategory]);

  const updateListing = useMutation({
    mutationFn: async () => {
      const response = await api.patch(`/listings/${id}`, {
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        condition,
        subcategorySlug,
        subcategoryName: selectedSubcategory?.name,
        attributes: normalizedAttributes,
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

  const valid = useMemo(() => {
    if (title.trim().length < 10 || description.trim().length < 20 || Number(price) < minimumPrice) return false;
    if (!selectedSubcategory) return false;
    return selectedSubcategory.features.every((feature) => {
      if (!feature.required) return true;
      return normalizedAttributes[feature.key] !== undefined;
    });
  }, [description, minimumPrice, normalizedAttributes, price, selectedSubcategory, title]);

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
      <Text className="mt-2 text-xs text-ink2">Minimum price: PKR {minimumPrice.toLocaleString()}</Text>

      {categoryDefinition ? (
        <>
          <Text className="mb-2 mt-4 text-sm font-semibold text-ink">Sub-category</Text>
          <View className="flex-row flex-wrap gap-2">
            {categoryDefinition.subcategories.map((item) => (
              <Pressable
                key={item.slug}
                onPress={() => {
                  setSubcategorySlug(item.slug);
                  setAttributes({});
                  if (Number(price) < item.minPrice) setPrice(String(item.minPrice));
                }}
                className={`rounded-xl px-4 py-3 ${subcategorySlug === item.slug ? 'bg-red' : 'border border-border bg-white'}`}
              >
                <Text className={`font-semibold ${subcategorySlug === item.slug ? 'text-white' : 'text-ink2'}`}>{item.name}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {selectedSubcategory ? (
        <>
          <Text className="mb-2 mt-4 text-sm font-semibold text-ink">Auto Features</Text>
          {selectedSubcategory.features.map((feature) => {
            if (feature.type === 'boolean') {
              const active = attributes[feature.key] === true;
              return (
                <Pressable
                  key={feature.key}
                  onPress={() => setAttributes((current) => ({ ...current, [feature.key]: !active }))}
                  className={`mb-3 rounded-xl px-4 py-4 ${active ? 'bg-red' : 'border border-border bg-white'}`}
                >
                  <Text className={`font-semibold ${active ? 'text-white' : 'text-ink2'}`}>{feature.label}</Text>
                </Pressable>
              );
            }

            return (
              <View key={feature.key}>
                <Text className="mb-2 mt-2 text-sm font-semibold text-ink">{feature.label}</Text>
                <TextInput
                  value={typeof attributes[feature.key] === 'string' ? String(attributes[feature.key]) : ''}
                  onChangeText={(value) => setAttributes((current) => ({ ...current, [feature.key]: value }))}
                  className="rounded-xl border border-border bg-white px-4 py-3 text-ink"
                  placeholder={feature.placeholder || feature.label}
                  keyboardType={feature.type === 'number' ? 'numeric' : 'default'}
                />
              </View>
            );
          })}
        </>
      ) : null}

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
