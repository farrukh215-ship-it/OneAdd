import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useRequireAuthAction } from '../../components/AuthGuardAction';
import { ListingCard } from '../../components/ListingCard';
import { useListing } from '../../hooks/useListing';
import { useListings } from '../../hooks/useListings';

export default function ListingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: listing } = useListing(id);
  const { data: related } = useListings({ category: listing?.category?.slug, limit: 4, sort: 'newest' });
  const [activeIndex, setActiveIndex] = useState(0);

  const initials = useMemo(() => {
    const name = listing?.user?.name || 'Seller';
    return name
      .split(' ')
      .map((part: string) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [listing?.user?.name]);

  const openWhatsapp = useRequireAuthAction(() => {});
  const showPhone = useRequireAuthAction(() => {});

  if (!listing) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="text-sm text-ink2">Loading...</Text>
      </View>
    );
  }

  const galleryItems = listing.images.length ? listing.images : ['placeholder'];

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <FlatList
          horizontal
          pagingEnabled
          data={galleryItems}
          keyExtractor={(item, index) => `${item}-${index}`}
          onMomentumScrollEnd={(event) => {
            const nextIndex = Math.round(
              event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width,
            );
            setActiveIndex(nextIndex);
          }}
          renderItem={({ item }) => (
            <View style={{ width: 393, aspectRatio: 4 / 3 }} className="bg-border">
              {item === 'placeholder' ? (
                <View className="flex-1 items-center justify-center">
                  <Text className="text-5xl">📦</Text>
                </View>
              ) : (
                <Image source={{ uri: item }} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
              )}
            </View>
          )}
        />

        <View className="flex-row items-center justify-center gap-2 py-3">
          {galleryItems.map((_: string, index: number) => (
            <View
              key={index}
              className={`h-2 w-2 rounded-full ${index === activeIndex ? 'bg-red' : 'bg-border'}`}
            />
          ))}
        </View>

        <View className="px-4">
          <Text className="mt-3 text-2xl font-extrabold text-ink">PKR {listing.price.toLocaleString()}</Text>
          <Text className="mt-1 text-lg font-semibold text-ink">{listing.title}</Text>
          <View className="mt-3 self-start rounded-md bg-[#F5F6F7] px-3 py-1.5">
            <Text className="text-xs font-semibold text-ink2">
              {listing.condition === 'NEW' ? 'Naya' : 'Purana'}
            </Text>
          </View>

          <View className="mt-3 h-px bg-border" />

          <View className="mt-3 rounded-xl bg-white p-4">
            <Text className="text-[13px] font-bold text-ink2">Tafseel</Text>
            <Text className="mt-2 text-sm leading-6 text-ink">{listing.description}</Text>
          </View>

          <View className="mt-3 h-px bg-border" />

          <View className="mt-3 rounded-xl bg-white p-4">
            <View className="flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-border">
                <Text className="font-bold text-ink2">{initials}</Text>
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[15px] font-bold text-ink">{listing.user?.name || 'Seller'}</Text>
                <Text className="mt-1 text-[13px] text-ink2">{listing.user?.city || listing.city}</Text>
                <Text className="mt-1 text-[12px] text-ink3">Joined recently</Text>
              </View>
              <View className="rounded-full bg-green px-2 py-1">
                <Text className="text-[11px] font-bold text-white">
                  {listing.user?.verified ? '✓ Verified' : '✓ Asli'}
                </Text>
              </View>
            </View>
            <Text className="mt-3 text-[12px] font-semibold text-green">✓ Asli Malik — Dealer Nahi</Text>
          </View>

          <View className="mt-5">
            <Text className="text-lg font-extrabold text-ink">Aur Dekho</Text>
            <FlatList
              data={(related?.data ?? []).filter((item: typeof listing) => item.id !== listing.id).slice(0, 4)}
              keyExtractor={(item) => item.id}
              numColumns={2}
              scrollEnabled={false}
              contentContainerStyle={{ paddingTop: 12 }}
              columnWrapperStyle={{ justifyContent: 'space-between' }}
              renderItem={({ item }) => (
                <ListingCard listing={item} onPress={() => router.push(`/listing/${item.id}`)} />
              )}
            />
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-white px-4 py-3">
        <View className="flex-row gap-3">
          <Pressable onPress={openWhatsapp} className="flex-1 rounded-xl bg-green py-3">
            <Text className="text-center text-[15px] font-bold text-white">💬 WhatsApp</Text>
          </Pressable>
          <Pressable onPress={showPhone} className="flex-1 rounded-xl bg-red py-3">
            <Text className="text-center text-[15px] font-bold text-white">📞 Number</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
