import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Easing,
  StyleSheet,
  Text,
  View,
  Vibration,
} from 'react-native';
import type { Category, Listing } from '@tgmg/types';
import { ListingCard } from '../../components/ListingCard';
import { SectionHeader } from '../../components/SectionHeader';
import { WideCard } from '../../components/WideCard';
import { useCategories } from '../../hooks/useCategories';
import { useListings } from '../../hooks/useListings';
import { useNotifications } from '../../hooks/useNotifications';
import { useWarmListingImages } from '../../hooks/useWarmListingImages';
import { buildRecommendedFeed } from '../../lib/mobile-recommendations';
import { getLocationPreference, getViewedCategorySlugs, getViewedListingIds } from '../../lib/mobile-preferences';
import { getRecentSearches } from '../../lib/search-history';

const quickActions = [
  { icon: '\u2795', label: 'Ad Post Karo', active: true, href: '/post/category' },
  { icon: '\u26A1', label: 'Taaza Listings', href: '/(tabs)/browse?sort=newest' },
  { icon: '\u{1F4CD}', label: 'Mere Paas', href: '/(tabs)/browse?city=Lahore&lat=31.5204&lng=74.3587&radiusKm=10' },
  { icon: '\u{1F525}', label: 'Top Deals', href: '/(tabs)/browse?sort=price_asc' },
  { icon: '\u{1F381}', label: 'Naye Items', href: '/(tabs)/browse?condition=NEW' },
  { icon: '\u{1F6D2}', label: 'Dukaan', href: '/(tabs)/browse?store=road&city=Lahore' },
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
    <View style={styles.categorySection}>
      <SectionHeader
        title={title}
        linkLabel="Aur Dekho"
        onPress={() => router.push(`/(tabs)/browse?category=${slug}${city ? `&city=${city}` : ''}`)}
      />
      <View style={styles.sectionInset}>
        {listings.length ? (
          listings.map((listing: Listing) => (
            <WideCard key={listing.id} listing={listing} onPress={() => router.push(`/listing/${listing.id}`)} />
          ))
        ) : (
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyStateText}>Is category mein abhi real listing nahi mili.</Text>
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
  const [refreshing, setRefreshing] = useState(false);
  const heroEntrance = useRef(new Animated.Value(0)).current;
  const heroOffset = useRef(new Animated.Value(18)).current;
  const chipsEntrance = useRef(new Animated.Value(0)).current;
  const actionsEntrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const locationPref = getLocationPreference();
    setPreferredCity(locationPref.city || 'Lahore');
    setPreferredLat(locationPref.lat);
    setPreferredLng(locationPref.lng);
    setRecentSearches(getRecentSearches());
    setViewedCategorySlugs(getViewedCategorySlugs());
    setViewedListingIds(getViewedListingIds());
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroEntrance, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(heroOffset, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(chipsEntrance, {
        toValue: 1,
        delay: 90,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(actionsEntrance, {
        toValue: 1,
        delay: 160,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [actionsEntrance, chipsEntrance, heroEntrance, heroOffset]);

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

  useWarmListingImages(recommended, 12);
  useWarmListingImages(personalized.data?.data ?? [], 8);
  useWarmListingImages(nearby.data?.data ?? [], 8);
  useWarmListingImages(featured.data?.data ?? [], 12);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      featured.refetch(),
      personalized.refetch(),
      nearby.refetch(),
      cityPool.refetch(),
    ]);
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.topBar}>
        <View>
          <Text style={styles.brand}>TGMG.</Text>
          <Text style={styles.tagline}>Asli log, asli cheezein</Text>
        </View>
        <View style={styles.topBarRight}>
          <Pressable onPress={() => router.push('/notifications')} style={styles.pillButton}>
            <Text style={styles.pillButtonText}>Inbox</Text>
            {unreadCount ? (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{Math.min(unreadCount, 9)}+</Text>
              </View>
            ) : null}
          </Pressable>
          <View style={styles.locationPill}>
            <View style={styles.locationDot} />
            <Text style={styles.locationPillText}>{preferredCity}</Text>
          </View>
        </View>
      </View>

      <Pressable onPress={() => router.push('/(tabs)/browse')} style={styles.searchBar}>
        <Text style={styles.searchLabel}>Search</Text>
        <Text style={styles.searchHint}>
          {topSearch ? `"${topSearch}" se related cheezein` : 'Kuch bhi dhundein...'}
        </Text>
      </Pressable>

      <Animated.View
        style={{
          opacity: chipsEntrance,
          transform: [
            {
              translateY: chipsEntrance.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0],
              }),
            },
          ],
        }}
      >
      <FlatList
        horizontal
        data={orderedCategories}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesRow}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => {
              Vibration.vibrate(12);
              router.push(`/(tabs)/browse?category=${item.slug}&city=${preferredCity}`);
            }}
            style={[styles.categoryChip, index === 0 && styles.categoryChipActive]}
          >
            <Text style={styles.categoryIcon}>{item.icon || '\u{1F4E6}'}</Text>
            <Text style={[styles.categoryName, index === 0 && styles.categoryNameActive]}>{item.name}</Text>
          </Pressable>
        )}
      />
      </Animated.View>

      <Animated.View
        style={{
          opacity: heroEntrance,
          transform: [{ translateY: heroOffset }],
        }}
      >
      <View style={styles.heroCard}>
        <View style={styles.heroBody}>
          <Text style={styles.heroEyebrow}>Curated Feed</Text>
          <Text style={styles.heroTitle}>Aap ke liye behtar listings</Text>
          <Text style={styles.heroText}>
            {topSearch
              ? `Recent search "${topSearch}" aur ${preferredCity} location ke mutabiq.`
              : `${preferredCity} location aur aapki viewed categories ke mutabiq.`}
          </Text>
          <View style={styles.heroTags}>
            {[preferredCity, topSearch || 'Fresh picks', viewedCategorySlugs[0] || 'Nearby'].map((item) => (
              <View key={item} style={styles.heroTag}>
                <Text style={styles.heroTagText}>{item}</Text>
              </View>
            ))}
          </View>
          <Pressable onPress={() => router.push('/(tabs)/browse')} style={styles.heroButton}>
            <Text style={styles.heroButtonText}>Abhi Dhundein</Text>
          </Pressable>
        </View>
        <View style={styles.heroAccent}>
          <Text style={styles.heroAccentText}>{'\u26A1'} For You</Text>
        </View>
      </View>
      </Animated.View>

      <Animated.View
        style={{
          opacity: actionsEntrance,
          transform: [
            {
              translateY: actionsEntrance.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0],
              }),
            },
          ],
        }}
      >
      <FlatList
        horizontal
        data={quickActions}
        keyExtractor={(item) => item.label}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickActionsRow}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(item.href as never)}
            style={[styles.quickAction, item.active ? styles.quickActionPrimary : styles.quickActionSecondary]}
          >
            <Text style={[styles.quickActionIcon, item.active ? styles.quickActionIconPrimary : styles.quickActionIconSecondary]}>
              {item.icon}
            </Text>
            <Text style={[styles.quickActionText, item.active ? styles.quickActionTextPrimary : styles.quickActionTextSecondary]}>
              {item.label}
            </Text>
          </Pressable>
        )}
      />
      </Animated.View>

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
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.gridRow}
            renderItem={({ item }) => (
              <ListingCard listing={item} onPress={() => router.push(`/listing/${item.id}`)} referenceCity={preferredCity} />
            )}
          />
        </>
      ) : null}

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
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.gridRow}
            renderItem={({ item }) => (
              <ListingCard listing={item} onPress={() => router.push(`/listing/${item.id}`)} referenceCity={preferredCity} />
            )}
          />
        </>
      ) : null}

      {typeof preferredLat === 'number' && typeof preferredLng === 'number' ? (
        <>
          <SectionHeader
            title={`Mere Paas | ${preferredCity}`}
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
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.gridRow}
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
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.gridRow}
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
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
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

      <View style={styles.sellCard}>
        <Text style={styles.sellTitle}>Apna saman bechna hai?</Text>
        <Text style={styles.sellText}>Free mein ad lagao aur buyer tak seedha pohancho.</Text>
        <Pressable onPress={() => router.push('/post/category')} style={styles.sellButton}>
          <Text style={styles.sellButtonText}>+ Ad Post Karo</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F0F2F5',
    flex: 1,
  },
  content: {
    paddingBottom: 32,
    paddingTop: 8,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  topBarRight: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  brand: {
    color: '#E53935',
    fontSize: 28,
    fontWeight: '800',
  },
  tagline: {
    color: '#65676B',
    fontSize: 12,
    marginTop: 2,
  },
  pillButton: {
    backgroundColor: '#F5F6F7',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    position: 'relative',
  },
  pillButtonText: {
    color: '#65676B',
    fontSize: 12,
    fontWeight: '700',
  },
  notificationBadge: {
    alignItems: 'center',
    backgroundColor: '#E53935',
    borderRadius: 999,
    justifyContent: 'center',
    minWidth: 20,
    paddingHorizontal: 6,
    position: 'absolute',
    right: -4,
    top: -4,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  locationPill: {
    alignItems: 'center',
    backgroundColor: '#F5F6F7',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  locationDot: {
    backgroundColor: '#2E7D32',
    borderRadius: 999,
    height: 9,
    width: 9,
  },
  locationPillText: {
    color: '#65676B',
    fontSize: 12,
    fontWeight: '700',
  },
  searchBar: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  searchLabel: {
    color: '#1C1E21',
    fontSize: 13,
    fontWeight: '700',
    marginRight: 10,
  },
  searchHint: {
    color: '#65676B',
    flex: 1,
    fontSize: 13,
  },
  categoriesRow: {
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  categoryChip: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginRight: 10,
    minWidth: 78,
    paddingHorizontal: 12,
    paddingVertical: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 1,
  },
  categoryChipActive: {
    backgroundColor: '#FFF1F0',
    borderWidth: 1,
    borderColor: '#F7C3C0',
  },
  categoryIcon: {
    fontSize: 22,
  },
  categoryName: {
    color: '#65676B',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
  categoryNameActive: {
    color: '#E53935',
  },
  heroCard: {
    backgroundColor: '#E53935',
    borderRadius: 24,
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 2,
    overflow: 'hidden',
  },
  heroBody: {
    flex: 1,
    padding: 18,
  },
  heroEyebrow: {
    color: '#FFD6D2',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 8,
  },
  heroText: {
    color: '#FFF4F3',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  heroTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  heroTag: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.32)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  heroButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  heroButtonText: {
    color: '#E53935',
    fontSize: 13,
    fontWeight: '800',
  },
  heroAccent: {
    alignItems: 'center',
    backgroundColor: '#C62828',
    justifyContent: 'center',
    minWidth: 90,
    paddingHorizontal: 10,
  },
  heroAccentText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    transform: [{ rotate: '-90deg' }],
  },
  quickActionsRow: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  quickAction: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    marginRight: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  quickActionPrimary: {
    backgroundColor: '#E53935',
  },
  quickActionSecondary: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E6EB',
    borderWidth: 1,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  quickActionIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  quickActionIconPrimary: {
    color: '#FFFFFF',
  },
  quickActionIconSecondary: {
    color: '#65676B',
  },
  quickActionTextPrimary: {
    color: '#FFFFFF',
  },
  quickActionTextSecondary: {
    color: '#65676B',
  },
  grid: {
    paddingHorizontal: 12,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  categorySection: {
    marginTop: 4,
  },
  sectionInset: {
    paddingHorizontal: 12,
  },
  emptyStateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  emptyStateText: {
    color: '#65676B',
    fontSize: 13,
  },
  sellCard: {
    backgroundColor: '#E53935',
    borderRadius: 24,
    marginHorizontal: 12,
    marginTop: 12,
    padding: 20,
  },
  sellTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  sellText: {
    color: '#FFF4F3',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: 'center',
  },
  sellButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sellButtonText: {
    color: '#E53935',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
});
