import type { Listing } from '@tgmg/types';
import { Image, Pressable, Text, View } from 'react-native';

export function WideCard({
  listing,
  onPress,
}: {
  listing: Listing;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="mb-3 flex-row rounded-xl bg-white p-3 shadow-sm">
      <View className="h-[90px] w-[90px] items-center justify-center overflow-hidden rounded-xl bg-border">
        {listing.images[0] ? (
          <Image source={{ uri: listing.images[0] }} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
        ) : (
          <Text className="text-4xl">📦</Text>
        )}
      </View>
      <View className="flex-1 px-3">
        <Text className="text-[18px] font-extrabold text-ink">PKR {listing.price.toLocaleString()}</Text>
        <Text className="mt-1 text-[13px] font-medium text-ink2" numberOfLines={1}>
          {listing.title}
        </Text>
        <View className="mt-2 flex-row gap-2">
          <View className="rounded-full bg-green px-2 py-1">
            <Text className="text-[11px] font-bold text-white">✓ Asli Malik</Text>
          </View>
          <View className="rounded-full bg-[#F5F6F7] px-2 py-1">
            <Text className="text-[11px] font-bold text-ink2">
              {listing.condition === 'NEW' ? 'New' : 'Used'}
            </Text>
          </View>
        </View>
        <Text className="mt-2 text-[11px] text-ink3">
          📍 {[listing.city, listing.area].filter(Boolean).join(', ')}
        </Text>
      </View>
    </Pressable>
  );
}

