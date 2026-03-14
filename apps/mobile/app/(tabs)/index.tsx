import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View, Vibration } from 'react-native';
import type { Category, Listing } from '@tgmg/types';
import { ListingCard } from '../../components/ListingCard';
import { SectionHeader } from '../../components/SectionHeader';
import { WideCard } from '../../components/WideCard';
import { useCategories } from '../../hooks/useCategories';
import { useListings } from '../../hooks/useListings';
import { useNotifications } from '../../hooks/useNotifications';
import { buildRecommendedFeed } from '../../lib/mobile-recommendations';
import { getLocationPreference, getViewedCategorySlugs, getViewedListingIds } from '../../lib/mobile-preferences';
import { getRecentSearches } from '../../lib/search-history';

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
  city,
}: {
  slug: string;
  title: string;
  city?: string;
}) {
  const router = useRouter();
  const { data } = useListings({ category: slug, city, limit: 3, sort: 'newest' });
  const listings = data?.data ?? [];

  return (
    <View className="mt-4">
      <SectionHeader
        title={title}
        linkLabel="Aur Dekho"
        onPress={() => router.push(`/(tabs)/browse?category=${slug}${city ? `&city=${city}` : ''}`)}
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
  const { unreadCount } = useNotifications();
  const [preferredCity, setPreferredCity] = useState('Lahore');
  const [preferredLat, setPreferredLat] = useState<number | undefined>();
  const [preferredLng, setPreferredLng] = useState<number | undefined>();
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [viewedCategorySlugs, setViewedCategorySlugs] = useState<string[]>([]);
  const [viewedListingIds, setViewedListingIds] = useState<string[]>([]);

  useEffect(() => {
    const locationPref = getLocationPreference();
    setPreferredCity(locationPref.city || 'Lahore');
    setPreferredLat(locationPref.lat);
    setPreferredLng(locationPref.lng);
    setRecentSearches(getRecentSearches());
    setViewedCategorySlugs(getViewedCategorySlugs());
    setViewedListingIds(getViewedListingIds());
  }, []);

  const topSearch = recentSearches[0];
  const featured = useListings({ city: preferredCity, limit: 8, sort: 'newest' });
  const personalized = useListings({
    q: topSearch,
    city: preferredCity,
    limit: 6,
    sort: 'newest',
  });
  const nearby = useListings({
    city: preferredCity,
    lat: preferredLat,
    lng: preferredLng,
    radiusKm: 15,
    limit: 6,
    sort: 'newest',
  });
  const cityPool = useListings({
    city: preferredCity,
    limit: 24,
    sort: 'newest',
  });

  const orderedCategories = useMemo(() => {
    if (!categories.length) return [] as Category[];
    const priority = viewedCategorySlugs
      .map((slug) => categories.find((item) => item.slug === slug))
      .filter((item): item is Category => Boolean(item));
    const rest = categories.filter((item) => !viewedCategorySlugs.includes(item.slug));
    return [...priority, ...rest];
  }, [categories, viewedCategorySlugs]);

  const recommended = useMemo(() => {
    const merged = [
      ...(cityPool.data?.data ?? []),
      ...(personalized.data?.data ?? []),
      ...(nearby.data?.data ?? []),
      ...(featured.data?.data ?? []),
    ];

    return buildRecommendedFeed(merged, {
      preferredCity,
      recentSearches,
      viewedCategorySlugs,
      viewedListingIds,
      nearbyListingIds: (nearby.data?.data ?? []).map((item) => item.id),
    }).slice(0, 8);
  }, [
    cityPool.data?.data,
    featured.data?.data,
    nearby.data?.data,
    personalized.data?.data,
    preferredCity,
    recentSearches,
    viewedCategorySlugs,
    viewedListingIds,
  ]);

  const continueWatching = useMemo(() => {
    const byViewed = new Set(viewedListingIds);
    return recommended.filter((item) => !byViewed.has(item.id)).slice(0, 4);
  }, [recommended, viewedListingIds]);

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: 24 }}>
      <View className="flex-row items-center justify-between px-3 py-2">
        <Text className="text-[22px] font-extrabold text-red">TGMG.</Text>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => router.push('/notifications')}
            className="relative rounded-full bg-[#F5F6F7] px-3 py-2"
          >
            <Text className="text-[12px] text-ink2">Bell</Text>
            {unreadCount ? (
              <View className="absolute -right-1 -top-1 h-5 min-w-[20px] items-center justify-center rounded-full bg-red px-1">
                <Text className="text-[10px] font-bold text-white">{Math.min(unreadCount, 9)}+</Text>
              </View>
            ) : null}
          </Pressable>
          <View className="flex-row items-center gap-2 rounded-full bg-[#F5F6F7] px-3 py-2">
            <View className="h-2.5 w-2.5 rounded-full bg-green" />
            <Text className="text-[12px] text-ink2">{preferredCity}</Text>
          </View>
        </View>
      </View>

      <Pressable
        onPress={() => router.push('/(tabs)/browse')}
        className="mx-3 mb-2 h-10 flex-row items-center rounded-full bg-[#F5F6F7] px-4"
      >
        <Text className="mr-2 text-ink3">Search</Text>
        <Text className="text-[13px] text-ink3">
          {topSearch ? `"${topSearch}" se related cheezein` : 'Kuch bhi dhundein...'}
        </Text>
      </Pressable>

      <FlatList
        horizontal
        data={orderedCategories}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        className="mb-2"
        contentContainerStyle={{ paddingHorizontal: 12 }}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => {
              Vibration.vibrate(12);
              router.push(`/(tabs)/browse?category=${item.slug}&city=${preferredCity}`);
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
            <Text className="text-[18px] font-extrabold text-white">Aapke liye curated feed</Text>
            <Text className="mt-1 text-[12px] text-white/80">
              {topSearch
                ? `Recent search "${topSearch}" aur ${preferredCity} location ke mutabiq.`
                : `${preferredCity} location aur aapki viewed categories ke mutabiq.`}
            </Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {[
                preferredCity,
                topSearch || 'Fresh picks',
                viewedCategorySlugs[0] || 'Nearby',
              ].map((item) => (
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
          <Text className="text-[40px] text-white">For You</Text>
        </View>
      </View>

      {recommended.length ? (
        <>
          <SectionHeader
            title="Recommended For You"
            linkLabel="Sab Dekho"
            onPress={() => router.push(`/(tabs)/browse?city=${preferredCity}`)}
          />
          <FlatList
            data={recommended}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={{ paddingHorizontal: 8 }}
            columnWrapperStyle={{ justifyContent: 'space-between' }}
            renderItem={({ item }) => (
              <ListingCard listing={item} onPress={() => router.push(`/listing/${item.id}`)} referenceCity={preferredCity} />
            )}
          />
        </>
      ) : null}

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

      {topSearch ? (
        <>
          <SectionHeader
            title={`For You: ${topSearch}`}
            linkLabel="Sab Dekho"
            onPress={() => router.push(`/(tabs)/browse?q=${encodeURIComponent(topSearch)}&city=${preferredCity}`)}
          />
          <FlatList
            data={personalized.data?.data ?? []}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={{ paddingHorizontal: 8 }}
            columnWrapperStyle={{ justifyContent: 'space-between' }}
            renderItem={({ item }) => (
              <ListingCard listing={item} onPress={() => router.push(`/listing/${item.id}`)} referenceCity={preferredCity} />
            )}
          />
        </>
      ) : null}

      {typeof preferredLat === 'number' && typeof preferredLng === 'number' ? (
        <>
          <SectionHeader
            title={`Mere Paas • ${preferredCity}`}
            linkLabel="Sab Dekho"
            onPress={() =>
              router.push(
                `/(tabs)/browse?city=${preferredCity}&lat=${preferredLat}&lng=${preferredLng}&radiusKm=15`,
              )
            }
          />
          <FlatList
            data={nearby.data?.data ?? []}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={{ paddingHorizontal: 8 }}
            columnWrapperStyle={{ justifyContent: 'space-between' }}
            renderItem={({ item }) => (
              <ListingCard listing={item} onPress={() => router.push(`/listing/${item.id}`)} referenceCity={preferredCity} />
            )}
          />
        </>
      ) : null}

      {continueWatching.length ? (
        <>
          <SectionHeader
            title="Aapki Activity Se"
            linkLabel="Browse"
            onPress={() => router.push('/(tabs)/browse')}
          />
          <FlatList
            data={continueWatching}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={{ paddingHorizontal: 8 }}
            columnWrapperStyle={{ justifyContent: 'space-between' }}
            renderItem={({ item }) => (
              <ListingCard listing={item} onPress={() => router.push(`/listing/${item.id}`)} referenceCity={preferredCity} />
            )}
          />
        </>
      ) : null}

      <SectionHeader title="Aaj Ki Listings" linkLabel="Sab Dekho" onPress={() => router.push('/(tabs)/browse')} />
      <FlatList
        data={featured.data?.data ?? []}
        keyExtractor={(item) => item.id}
        numColumns={2}
        scrollEnabled={false}
        contentContainerStyle={{ paddingHorizontal: 8 }}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        renderItem={({ item }) => (
          <ListingCard listing={item} onPress={() => router.push(`/listing/${item.id}`)} referenceCity={preferredCity} />
        )}
      />

      {orderedCategories.slice(0, 6).map((category) => (
        <CategoryShowcase
          key={category.id}
          slug={category.slug}
          title={`${category.icon} ${category.name}`}
          city={preferredCity}
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
