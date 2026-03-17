import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Linking, Modal, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import type { Listing, ListingThreadResponse } from '@tgmg/types';
import { useRequireAuthAction } from '../../components/AuthGuardAction';
import { ListingCard } from '../../components/ListingCard';
import { useAuth } from '../../hooks/useAuth';
import { useListing } from '../../hooks/useListing';
import { useListings } from '../../hooks/useListings';
import { api } from '../../lib/api';
import { getListingStatusMeta } from '../../lib/listing-ui';
import { trackViewedListing } from '../../lib/mobile-preferences';
import { uploadPostMediaToR2 } from '../../lib/uploads';

export default function ListingDetailScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useAuth();
  const { data: listing, isLoading, isError } = useListing(id);
  const { data: related } = useListings({ category: listing?.category?.slug, limit: 4, sort: 'newest' });
  const [activeIndex, setActiveIndex] = useState(0);
  const [thread, setThread] = useState<ListingThreadResponse | null>(null);
  const [message, setMessage] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  const [chatImageUri, setChatImageUri] = useState<string | null>(null);
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);

  const { data: savedItems = [] } = useQuery({
    queryKey: ['saved-listings', currentUser?.id],
    enabled: Boolean(currentUser),
    queryFn: async () => {
      const response = await api.get<Listing[] | { data?: Listing[] }>('/listings/saved');
      return Array.isArray(response.data) ? response.data : response.data?.data ?? [];
    },
  });

  const isSaved = savedItems.some((item) => item.id === listing?.id);
  const statusMeta = listing ? getListingStatusMeta(listing) : null;

  const initials = useMemo(() => {
    const name = listing?.user?.name || 'Seller';
    return name
      .split(' ')
      .map((part: string) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [listing?.user?.name]);

  const attributeEntries = useMemo(() => {
    if (!listing?.attributes) return [] as Array<[string, string | number | boolean]>;
    return Object.entries(listing.attributes as Record<string, string | number | boolean>);
  }, [listing?.attributes]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!listing) return;
      if (isSaved) {
        await api.delete(`/listings/${listing.id}/save`);
      } else {
        await api.post(`/listings/${listing.id}/save`);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['saved-listings'] });
    },
  });

  const openWhatsapp = useRequireAuthAction(() => {
    void (async () => {
      if (!listing) return;
      const response = await api.get<{ phone: string }>(`/listings/${listing.id}/contact`);
      const phone = response.data.phone;
      setRevealedPhone(phone);
      await Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`);
    })();
  });

  const showPhone = useRequireAuthAction(() => {
    void (async () => {
      if (!listing) return;
      const response = await api.get<{ phone: string }>(`/listings/${listing.id}/contact`);
      setRevealedPhone(response.data.phone);
    })();
  });

  const sendPublicMessage = useRequireAuthAction(() => {
    void (async () => {
      const text = message.trim();
      let imageUrl: string | undefined;

      if (!text && !chatImageUri) return;

      if (chatImageUri) {
        const upload = await uploadPostMediaToR2({ images: [chatImageUri], videos: [] });
        imageUrl = upload.imageUrls[0];
      }

      await api.post(`/listings/${id}/chat/messages`, { message: text, imageUrl });
      setMessage('');
      setChatImageUri(null);
      const response = await api.get<ListingThreadResponse>(`/listings/${id}/chat`);
      setThread(response.data);
    })();
  });

  const sendOffer = useRequireAuthAction(() => {
    void (async () => {
      const amount = Number(offerAmount);
      if (!amount || amount < 100) return;
      await api.post(`/listings/${id}/offers`, { amount });
      setOfferAmount('');
      const response = await api.get<ListingThreadResponse>(`/listings/${id}/chat`);
      setThread(response.data);
    })();
  });

  const pickChatImage = useRequireAuthAction(() => {
    void (async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled) {
        setChatImageUri(result.assets[0]?.uri ?? null);
      }
    })();
  });

  useEffect(() => {
    if (!id) return;
    const loadThread = async () => {
      try {
        const response = await api.get<ListingThreadResponse>(`/listings/${id}/chat`);
        setThread(response.data);
      } catch {
        setThread(null);
      }
    };
    void loadThread();
  }, [id]);

  useEffect(() => {
    if (listing) {
      trackViewedListing(listing);
    }
  }, [listing]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="text-sm text-ink2">Loading...</Text>
      </View>
    );
  }

  if (isError || !listing) {
    return (
      <View className="flex-1 items-center justify-center bg-bg px-6">
        <Text className="text-base font-bold text-ink">Listing nahi mili</Text>
        <Text className="mt-2 text-center text-sm text-ink2">
          Real listing data load nahi hui. Dobara try karein.
        </Text>
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
              <Pressable className="flex-1" onPress={() => item !== 'placeholder' && setFullScreenVisible(true)}>
                {item === 'placeholder' ? (
                  <View className="flex-1 items-center justify-center">
                    <Text className="text-sm font-semibold text-ink3">No Image</Text>
                  </View>
                ) : (
                  <Image source={{ uri: item }} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
                )}
              </Pressable>
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

          <View className="mt-3 flex-row flex-wrap gap-2">
            <View className={`self-start rounded-md px-3 py-1.5 ${statusMeta?.badgeClassName}`}>
              <Text className={`text-xs font-semibold ${statusMeta?.textClassName}`}>{statusMeta?.label}</Text>
            </View>
            <View className="self-start rounded-md bg-[#F5F6F7] px-3 py-1.5">
              <Text className="text-xs font-semibold text-ink2">
                {listing.condition === 'NEW' ? 'Naya' : 'Purana'}
              </Text>
            </View>
          </View>

          <View className="mt-3 flex-row gap-2">
            <Pressable
              onPress={() => saveMutation.mutate()}
              className={`flex-1 rounded-xl border px-4 py-3 ${
                isSaved ? 'border-green bg-green/10' : 'border-border bg-white'
              }`}
            >
              <Text className={`text-center font-semibold ${isSaved ? 'text-green' : 'text-ink'}`}>
                {isSaved ? 'Saved' : 'Save Ad'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() =>
                Share.share({
                  message: `Dekho: ${listing.title} - https://teragharmeraghar.com/listings/${listing.id}`,
                })
              }
              className="flex-1 rounded-xl border border-border bg-white px-4 py-3"
            >
              <Text className="text-center font-semibold text-ink">Share</Text>
            </Pressable>
          </View>

          <View className="mt-3 h-px bg-border" />

          <View className="mt-3 rounded-xl bg-white p-4">
            <Text className="text-[13px] font-bold text-ink2">Tafseel</Text>
            <Text className="mt-2 text-sm leading-6 text-ink">{listing.description}</Text>
          </View>

          {attributeEntries.length ? (
            <View className="mt-3 rounded-xl bg-white p-4">
              <Text className="text-[13px] font-bold text-ink2">Auto Features</Text>
              <View className="mt-3 flex-row flex-wrap gap-2">
                {attributeEntries.map(([key, value]) => (
                  <View key={key} className="rounded-xl bg-[#F5F6F7] px-3 py-2">
                    <Text className="text-[11px] font-semibold text-ink3">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, (ch) => ch.toUpperCase())}
                    </Text>
                    <Text className="mt-1 text-[13px] font-bold text-ink">{String(value)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View className="mt-3 h-px bg-border" />

          <View className="mt-3 rounded-xl bg-white p-4">
            <View className="flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-border">
                <Text className="font-bold text-ink2">{initials}</Text>
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[15px] font-bold text-ink">{listing.user?.name || 'Seller'}</Text>
                <Text className="mt-1 text-[13px] text-ink2">{listing.user?.city || listing.city}</Text>
                <Text className="mt-1 text-[12px] text-ink3">
                  Joined {new Date(listing.user?.createdAt ?? listing.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <View className="rounded-full bg-green px-2 py-1">
                <Text className="text-[11px] font-bold text-white">
                  {listing.user?.verified ? 'Verified' : 'Asli Malik'}
                </Text>
              </View>
            </View>
            <Text className="mt-3 text-[12px] font-semibold text-green">Asli Malik - Dealer Nahi</Text>
          </View>

          <View className="mt-3 rounded-xl bg-white p-4">
            <Text className="text-base font-bold text-ink">Public Chat & Offers</Text>
            <Text className="mt-1 text-xs text-ink2">Is listing ki chat sab users ko nazar aati hai.</Text>
            {thread?.nearestOffer ? (
              <Text className="mt-2 text-xs font-semibold text-red">
                Closest: PKR {thread.nearestOffer.amount.toLocaleString()}
              </Text>
            ) : null}
            {thread?.bestOffer ? (
              <Text className="mt-1 text-xs font-semibold text-green">
                Best: PKR {thread.bestOffer.amount.toLocaleString()}
              </Text>
            ) : null}
            <View className="mt-3 gap-2">
              <TextInput
                value={message}
                onChangeText={setMessage}
                className="rounded-xl border border-border bg-white px-3 py-3 text-ink"
                placeholder="Public message"
              />
              {chatImageUri ? (
                <View className="rounded-xl border border-border bg-[#F5F6F7] px-3 py-3">
                  <Text className="text-xs font-semibold text-ink2">Image attached</Text>
                  <Text className="mt-1 text-xs text-ink3" numberOfLines={1}>
                    {chatImageUri}
                  </Text>
                </View>
              ) : null}
              <TextInput
                value={offerAmount}
                onChangeText={setOfferAmount}
                className="rounded-xl border border-border bg-white px-3 py-3 text-ink"
                placeholder="Offer amount"
                keyboardType="numeric"
              />
              <View className="flex-row gap-2">
                <Pressable onPress={pickChatImage} className="rounded-xl border border-border bg-white px-4 py-3">
                  <Text className="text-center font-semibold text-ink">Add Image</Text>
                </Pressable>
                <Pressable onPress={sendPublicMessage} className="flex-1 rounded-xl border border-border bg-white py-3">
                  <Text className="text-center font-semibold text-ink">Send</Text>
                </Pressable>
                <Pressable onPress={sendOffer} className="flex-1 rounded-xl bg-red py-3">
                  <Text className="text-center font-semibold text-white">Offer</Text>
                </Pressable>
              </View>
            </View>
            <View className="mt-3 gap-2">
              {(thread?.messages ?? []).slice(-6).map((entry) => (
                <View key={entry.id} className="rounded-lg bg-[#F5F6F7] p-2">
                  <Text className="text-xs font-semibold text-ink">{entry.user?.name || 'User'}</Text>
                  <Text className="text-xs text-ink2">{entry.message}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className="mt-5">
            <Text className="text-lg font-extrabold text-ink">Aur Dekho</Text>
            <FlatList
              data={(related?.data ?? []).filter((item) => item.id !== listing.id).slice(0, 4)}
              keyExtractor={(item) => item.id}
              numColumns={2}
              scrollEnabled={false}
              contentContainerStyle={{ paddingTop: 12 }}
              columnWrapperStyle={{ justifyContent: 'space-between' }}
              renderItem={({ item }) => (
                <ListingCard listing={item} onPress={() => router.push(`/listing/${item.id}`)} referenceCity={listing.city} />
              )}
            />
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-white px-4 py-3">
        {revealedPhone ? (
          <View className="mb-2 rounded-xl bg-[#F5F6F7] px-3 py-2">
            <Text className="text-center text-xs font-semibold text-ink2">{revealedPhone}</Text>
          </View>
        ) : null}
        <View className="flex-row gap-3">
          <Pressable onPress={openWhatsapp} className="flex-1 rounded-xl bg-green py-3">
            <Text className="text-center text-[15px] font-bold text-white">WhatsApp</Text>
          </Pressable>
          <Pressable onPress={showPhone} className="flex-1 rounded-xl bg-red py-3">
            <Text className="text-center text-[15px] font-bold text-white">Phone</Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={fullScreenVisible} transparent animationType="fade">
        <View className="flex-1 bg-black">
          <View className="flex-row justify-end px-4 pt-14">
            <Pressable onPress={() => setFullScreenVisible(false)} className="rounded-full bg-white/15 px-4 py-2">
              <Text className="font-semibold text-white">Close</Text>
            </Pressable>
          </View>
          <FlatList
            horizontal
            pagingEnabled
            data={galleryItems.filter((item) => item !== 'placeholder')}
            keyExtractor={(item, index) => `${item}-${index}`}
            initialScrollIndex={Math.min(activeIndex, Math.max(galleryItems.filter((item) => item !== 'placeholder').length - 1, 0))}
            renderItem={({ item }) => (
              <View style={{ width: 393 }} className="flex-1 items-center justify-center">
                <Image source={{ uri: item }} resizeMode="contain" style={{ width: '100%', height: '82%' }} />
              </View>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}
