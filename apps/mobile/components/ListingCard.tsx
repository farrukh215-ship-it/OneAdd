import type { Listing } from '@tgmg/types';
import { Dimensions, Image, Pressable, Text, View } from 'react-native';
import { distanceFromCity } from '../lib/distance';

const screenWidth = Dimensions.get('window').width;
const cardWidth = (screenWidth - 24) / 2;

export function ListingCard({
  listing,
  onPress,
  referenceCity = 'Lahore',
}: {
  listing: Listing;
  onPress: () => void;
  referenceCity?: string;
}) {
  const location = [listing.city, listing.area].filter(Boolean).join(', ');
  const distance =
    typeof listing.distanceKm === 'number'
      ? Math.round(listing.distanceKm)
      : distanceFromCity(
          referenceCity,
          listing.city,
          typeof listing.lat === 'number' && typeof listing.lng === 'number'
            ? { lat: listing.lat, lng: listing.lng }
            : undefined,
        );

  return (
    <Pressable
      onPress={onPress}
      className="mb-2 overflow-hidden rounded-xl bg-white shadow-sm"
      style={{ width: cardWidth }}
    >
      {({ pressed }) => (
        <View style={{ opacity: pressed ? 0.9 : 1 }}>
          <View className="relative bg-border" style={{ width: cardWidth, aspectRatio: 1 }}>
            {listing.images[0] ? (
              <Image
                source={{ uri: listing.images[0] }}
                resizeMode="cover"
                style={{ width: '100%', height: '100%' }}
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Text className="text-3xl">📦</Text>
              </View>
            )}
            <View className="absolute bottom-2 left-2 rounded-md bg-green px-2 py-0.5">
              <Text className="text-[9px] font-bold text-white">✓ Asli Malik</Text>
            </View>
            <View className="absolute right-2 top-2 h-7 w-7 items-center justify-center rounded-full bg-white/90">
              <Text className="text-sm">♡</Text>
            </View>
          </View>
          <View className="p-2.5">
            <Text className="text-base font-extrabold text-ink">PKR {listing.price.toLocaleString()}</Text>
            <Text className="mt-1 text-[12px] font-medium text-ink2" numberOfLines={2}>
              {listing.title}
            </Text>
            <Text className="mt-2 text-[11px] text-ink3">
              📍 {location || listing.city}
              {distance !== null ? ` • ${distance} km` : ''}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

