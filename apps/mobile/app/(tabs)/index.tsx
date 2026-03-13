import { useRouter } from 'expo-router';
import { FlatList, Pressable, ScrollView, Text, View, Vibration } from 'react-native';
import type { Listing } from '@tgmg/types';
import { ListingCard } from '../../components/ListingCard';
import { SectionHeader } from '../../components/SectionHeader';
import { WideCard } from '../../components/WideCard';
import { useCategories } from '../../hooks/useCategories';
import { useListings } from '../../hooks/useListings';

const quickActions = [
  { label: '+ Ad Post Karo', active: true, href: '/post/category' },
  { label: 'Taaza Listings', href: '/(tabs)/browse?sort=newest' },
  { label: 'Mere Paas', href: '/(tabs)/browse?city=Lahore&lat=31.5204&lng=74.3587&radiusKm=10' },
  { label: 'Top Deals', href: '/(tabs)/browse?sort=price_asc' },
  { label: 'Naye Items', href: '/(tabs)/browse?condition=NEW' },
  { label: 'Dukaan', href: '/(tabs)/browse?store=road&city=Lahore' },
];

function CategoryShowcase({
  slug,
  title,
}: {
  slug: string;
  title: string;
}) {
  const router = useRouter();
  const { data } = useListings({ category: slug, limit: 3, sort: 'newest' });
  const listings = data?.data ?? [];

  return (
    <View className="mt-4">
      <SectionHeader
        title={title}
        linkLabel="Aur Dekho"
        onPress={() => router.push(`/(tabs)/browse?category=${slug}`)}
      />
      <View className="mx-3">
        {listings.length ? (
          listings.map((listing: Listing) => (
            <WideCard key={listing.id} listing={listing} onPress={() => router.push(`/listing/${listing.id}`)} />
          ))
        ) : (
          <View className="rounded-xl bg-white px-4 py-4 shadow-sm">
            <Text className="text-sm text-ink2">Is category mein abhi real listing nahi mili.</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { data: categories = [] } = useCategories();
  const { data: featured } = useListings({ limit: 8, sort: 'newest' });

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: 24 }}>
      <View className="flex-row items-center justify-between px-3 py-2">
        <Text className="text-[22px] font-extrabold text-red">TGMG.</Text>
        <View className="flex-row items-center gap-2 rounded-full bg-[#F5F6F7] px-3 py-2">
          <View className="h-2.5 w-2.5 rounded-full bg-green" />
          <Text className="text-[12px] text-ink2">Lahore</Text>
        </View>
      </View>

      <Pressable
        onPress={() => router.push('/(tabs)/browse')}
        className="mx-3 mb-2 h-10 flex-row items-center rounded-full bg-[#F5F6F7] px-4"
      >
        <Text className="mr-2 text-ink3">Search</Text>
        <Text className="text-[13px] text-ink3">Kuch bhi dhundein...</Text>
      </Pressable>

      <FlatList
        horizontal
        data={categories}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        className="mb-2"
        contentContainerStyle={{ paddingHorizontal: 12 }}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => {
              Vibration.vibrate(12);
              router.push(`/(tabs)/browse?category=${item.slug}`);
            }}
            className="mr-3 items-center px-3 py-2"
          >
            <Text className="text-[22px]">{item.icon}</Text>
            <Text className={`mt-1 text-[10px] font-semibold ${index === 0 ? 'text-red' : 'text-ink2'}`}>
              {item.name}
            </Text>
            <View className={`mt-1 h-0.5 w-full ${index === 0 ? 'bg-red' : 'bg-transparent'}`} />
          </Pressable>
        )}
      />

      <View className="mx-3 rounded-xl bg-red p-4">
        <View className="flex-row items-center justify-between">
          <View className="max-w-[76%]">
            <Text className="text-[18px] font-extrabold text-white">OLX se tang?</Text>
            <Text className="mt-1 text-[12px] text-white/80">
              Sirf asli malik bechte hain - koi dealer nahi
            </Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {['Verified Sellers', 'No Dealers', 'Free'].map((item) => (
                <View key={item} className="rounded-full border border-white/30 bg-white/15 px-3 py-1">
                  <Text className="text-[11px] text-white">{item}</Text>
                </View>
              ))}
            </View>
            <Pressable
              onPress={() => router.push('/(tabs)/browse')}
              className="mt-4 self-start rounded-lg bg-white px-4 py-2"
            >
              <Text className="font-bold text-red">Abhi Dhundein</Text>
            </Pressable>
          </View>
          <Text className="text-[40px] text-white">24H</Text>
        </View>
      </View>

      <FlatList
        horizontal
        data={quickActions}
        keyExtractor={(item) => item.label}
        showsHorizontalScrollIndicator={false}
        className="mt-3"
        contentContainerStyle={{ paddingHorizontal: 12 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(item.href as never)}
            className={`mr-2 flex-row items-center rounded-full px-4 py-2 shadow-sm ${
              item.active ? 'bg-red' : 'border border-border bg-white'
            }`}
          >
            <Text className={`text-xs font-semibold ${item.active ? 'text-white' : 'text-ink2'}`}>
              {item.label}
            </Text>
          </Pressable>
        )}
      />

      <View className="mx-3 mt-3 flex-row gap-2">
        {[
          { value: '12K+', label: 'Active Listings' },
          { value: '0', label: 'Dealers Allowed' },
          { value: 'Free', label: 'Ad Lagao' },
        ].map((stat) => (
          <View key={stat.label} className="flex-1 rounded-xl bg-white py-3 shadow-sm">
            <Text className="text-center text-[20px] font-extrabold text-red">{stat.value}</Text>
            <Text className="mt-1 text-center text-[11px] text-ink2">{stat.label}</Text>
          </View>
        ))}
      </View>

      <SectionHeader title="Aaj Ki Listings" linkLabel="Sab Dekho" onPress={() => router.push('/(tabs)/browse')} />
      <FlatList
        data={featured?.data ?? []}
        keyExtractor={(item) => item.id}
        numColumns={2}
        scrollEnabled={false}
        contentContainerStyle={{ paddingHorizontal: 8 }}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        renderItem={({ item }) => (
          <ListingCard listing={item} onPress={() => router.push(`/listing/${item.id}`)} />
        )}
      />

      <View className="mx-3 my-4 rounded-xl bg-[#1F2937] px-4 py-3">
        <Text className="text-sm font-bold text-white">Koi Dealer Allowed Nahi</Text>
        <Text className="mt-1 text-xs text-white/80">Sirf asli ghar walay seller ko listing milti hai.</Text>
      </View>

      {categories.map((category) => (
        <CategoryShowcase
          key={category.id}
          slug={category.slug}
          title={`${category.icon} ${category.name}`}
        />
      ))}

      <View className="mx-3 mt-2 rounded-xl bg-red p-4">
        <Text className="mt-2 text-center text-lg font-extrabold text-white">Apna saman bechna hai?</Text>
        <Text className="mt-1 text-center text-sm text-white/80">
          Free mein ad lagao aur buyer tak seedha pohancho.
        </Text>
        <Pressable onPress={() => router.push('/post/category')} className="mt-4 rounded-xl bg-white px-4 py-3">
          <Text className="text-center font-bold text-red">+ Ad Post Karo</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
