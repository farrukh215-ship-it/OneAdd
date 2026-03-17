import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  Easing,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Listing, SearchSuggestion } from '@tgmg/types';
import { ListingCard } from '../../components/ListingCard';
import { useCategories } from '../../hooks/useCategories';
import { useListings } from '../../hooks/useListings';
import { useWarmListingImages } from '../../hooks/useWarmListingImages';
import { api } from '../../lib/api';
import { getLocationPreference, setLocationPreference } from '../../lib/mobile-preferences';
import { addRecentSearch, clearRecentSearches, getRecentSearches } from '../../lib/search-history';

const cities = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad'];

export default function BrowseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    category?: string;
    city?: string;
    sort?: string;
    q?: string;
    store?: string;
    lat?: string;
    lng?: string;
    radiusKm?: string;
    condition?: 'NEW' | 'USED';
  }>();
  const { data: categories = [] } = useCategories();
  const [category, setCategory] = useState<string | undefined>(params.category);
  const [city, setCity] = useState<string | undefined>(params.city);
  const [sort, setSort] = useState(params.sort ?? 'newest');
  const [condition, setCondition] = useState<'NEW' | 'USED' | undefined>(params.condition);
  const [q, setQ] = useState(params.q ?? '');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [popularSearches, setPopularSearches] = useState<SearchSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => getRecentSearches());
  const [store, setStore] = useState<string | undefined>(params.store);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Listing[]>([]);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const entrance = useRef(new Animated.Value(0)).current;
  const snapPoints = useMemo(() => ['70%'], []);
  const lat = params.lat ? Number(params.lat) : undefined;
  const lng = params.lng ? Number(params.lng) : undefined;
  const radiusKm = params.radiusKm ? Number(params.radiusKm) : undefined;

  const listingsQuery = useListings({
    q: q.trim() || undefined,
    category,
    city,
    store,
    lat,
    lng,
    radiusKm,
    sort,
    condition,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    page,
    limit: 20,
  });

  useEffect(() => {
    void (async () => {
      try {
        const response = await api.get<SearchSuggestion[]>('/search/popular');
        setPopularSearches(response.data);
      } catch {
        setPopularSearches([]);
      }
    })();
  }, []);

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  useEffect(() => {
    const savedLocation = getLocationPreference();
    if (!params.city && savedLocation.city) setCity(savedLocation.city);
  }, [params.city]);

  useEffect(() => {
    setCategory(params.category);
    setCity(params.city);
    setSort(params.sort ?? 'newest');
    setCondition(params.condition);
    setQ(params.q ?? '');
    setStore(params.store);
    setPage(1);
  }, [params.category, params.city, params.condition, params.sort, params.q, params.store]);

  useEffect(() => {
    setPage(1);
  }, [category, city, sort, condition, store, minPrice, maxPrice, lat, lng, radiusKm]);

  useEffect(() => {
    const value = q.trim();
    if (value.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const response = await api.get<SearchSuggestion[]>('/search/suggestions', { params: { q: value } });
        setSuggestions(response.data);
      } catch {
        setSuggestions([]);
      }
    }, 240);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    const data = listingsQuery.data;
    if (!data) return;

    setItems((current) => {
      const base = data.page <= 1 ? [] : current;
      const merged = [...base, ...data.data];
      return merged.filter((item, index, array) => array.findIndex((entry) => entry.id === item.id) === index);
    });
  }, [listingsQuery.data]);

  useWarmListingImages(items, 18);

  const submitSearch = (value: string) => {
    const term = value.trim();
    setQ(term);
    setPage(1);
    if (term) {
      addRecentSearch(term);
      setRecentSearches(getRecentSearches());
    }
  };

  useEffect(() => {
    if (city || typeof lat === 'number' || typeof lng === 'number') {
      setLocationPreference({
        ...getLocationPreference(),
        city,
        lat,
        lng,
      });
    }
  }, [city, lat, lng]);

  const total = listingsQuery.data?.total ?? 0;

  return (
    <View style={styles.screen}>
      <Animated.View
        style={{
          opacity: entrance,
          transform: [
            {
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [14, 0],
              }),
            },
          ],
        }}
      >
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>{total} listings mile</Text>
            <Text style={styles.headerSubtle}>
              {q.trim() ? `Search: "${q.trim()}"` : city ? `${city} ke liye fresh inventory` : 'Apni next cheez yahan dhundo'}
            </Text>
          </View>
          <Pressable onPress={() => bottomSheetRef.current?.expand()} style={styles.filterButton}>
            <Text style={styles.filterButtonText}>Filters</Text>
          </Pressable>
        </View>

        <TextInput
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => submitSearch(q)}
          style={styles.searchInput}
          placeholder="Search with prediction..."
          placeholderTextColor="#9AA1A9"
        />

        {suggestions.length ? (
          <View style={styles.suggestionBox}>
            {suggestions.slice(0, 5).map((item, index) => (
              <Pressable key={`${item.label}-${index}`} onPress={() => submitSearch(item.label)} style={styles.suggestionItem}>
                <Text style={styles.suggestionText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : !q.trim() && (recentSearches.length || popularSearches.length) ? (
          <View style={styles.discoveryStack}>
            {recentSearches.length ? (
              <View style={styles.discoveryCard}>
                <View style={styles.discoveryHeader}>
                  <Text style={styles.discoveryTitle}>Recent Searches</Text>
                  <Pressable
                    onPress={() => {
                      clearRecentSearches();
                      setRecentSearches([]);
                    }}
                  >
                    <Text style={styles.clearText}>Clear</Text>
                  </Pressable>
                </View>
                <View style={styles.chipsRow}>
                  {recentSearches.map((item) => (
                    <Pressable key={item} onPress={() => submitSearch(item)} style={styles.softChip}>
                      <Text style={styles.softChipText}>{item}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {popularSearches.length ? (
              <View style={styles.discoveryCard}>
                <Text style={styles.discoveryTitle}>Popular</Text>
                <View style={styles.chipsRow}>
                  {popularSearches.slice(0, 6).map((item, index) => (
                    <Pressable key={`${item.label}-${index}`} onPress={() => submitSearch(item.label)} style={styles.popularChip}>
                      <Text style={styles.popularChipText}>{item.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.sortRow}>
          {[
            { value: 'newest', label: 'Newest' },
            { value: 'price_asc', label: 'Price Low' },
            { value: 'price_desc', label: 'Price High' },
          ].map((item) => {
            const active = sort === item.value;
            return (
              <Pressable key={item.value} onPress={() => setSort(item.value)} style={[styles.sortChip, active && styles.sortChipActive]}>
                <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {typeof lat === 'number' && typeof lng === 'number' ? (
          <View style={styles.nearbyBanner}>
            <Text style={styles.nearbyBannerText}>
              {'\u{1F4CD}'} Mere paas mode: {radiusKm ?? 10} km ke andar listings pehle.
            </Text>
          </View>
        ) : null}
      </View>
      </Animated.View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
        refreshControl={
          <RefreshControl
            refreshing={listingsQuery.isRefetching}
            onRefresh={() => {
              setPage(1);
              setItems([]);
              void listingsQuery.refetch();
            }}
          />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (!listingsQuery.data || page >= listingsQuery.data.totalPages || listingsQuery.isFetching) return;
          setPage((current) => current + 1);
        }}
        ListEmptyComponent={
          !listingsQuery.isFetching ? (
            <View style={styles.emptyResults}>
              <Text style={styles.emptyResultsTitle}>Koi listing nahi mili</Text>
              <Text style={styles.emptyResultsText}>Search broad karein, city change karein, ya filters reset karein.</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          listingsQuery.isFetching && items.length ? (
            <View style={styles.footerLoader}>
              <Text style={styles.footerLoaderText}>Aur listings load ho rahi hain...</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <ListingCard listing={item} onPress={() => router.push(`/listing/${item.id}`)} referenceCity={city || 'Lahore'} />
        )}
      />

      <BottomSheet ref={bottomSheetRef} index={-1} snapPoints={snapPoints} enablePanDownToClose>
        <BottomSheetView style={styles.sheet}>
          <Text style={styles.sheetTitle}>Browse Filters</Text>

          <View>
            <Text style={styles.sheetLabel}>Category</Text>
            <FlatList
              horizontal
              data={categories}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => {
                const active = category === item.slug;
                return (
                  <Pressable onPress={() => setCategory(item.slug)} style={[styles.sheetChip, active && styles.sheetChipActive, styles.sheetChipSpacing]}>
                    <Text style={[styles.sheetChipText, active && styles.sheetChipTextActive]}>
                      {item.icon} {item.name}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </View>

          <View>
            <Text style={styles.sheetLabel}>City</Text>
            <FlatList
              horizontal
              data={cities}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => {
                const active = city === item;
                return (
                  <Pressable onPress={() => setCity(item)} style={[styles.sheetChip, active && styles.sheetChipActive, styles.sheetChipSpacing]}>
                    <Text style={[styles.sheetChipText, active && styles.sheetChipTextActive]}>{item}</Text>
                  </Pressable>
                );
              }}
            />
          </View>

          <View>
            <Text style={styles.sheetLabel}>Dukaan Type</Text>
            <View style={styles.sheetRow}>
              {[
                { value: 'online', label: 'Online' },
                { value: 'road', label: 'Road' },
              ].map((item) => {
                const active = store === item.value;
                return (
                  <Pressable key={item.value} onPress={() => setStore(item.value)} style={[styles.segmentButton, active && styles.segmentButtonActive]}>
                    <Text style={[styles.segmentButtonText, active && styles.segmentButtonTextActive]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.sheetRow}>
            <TextInput
              value={minPrice}
              onChangeText={setMinPrice}
              style={[styles.priceInput, styles.priceInputSpacing]}
              placeholder="Min price"
              keyboardType="numeric"
              placeholderTextColor="#9AA1A9"
            />
            <TextInput
              value={maxPrice}
              onChangeText={setMaxPrice}
              style={styles.priceInput}
              placeholder="Max price"
              keyboardType="numeric"
              placeholderTextColor="#9AA1A9"
            />
          </View>

          <View style={styles.sheetRow}>
            {[
              { value: 'NEW', label: 'Naya' },
              { value: 'USED', label: 'Purana' },
            ].map((item) => {
              const active = condition === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => setCondition(item.value as 'NEW' | 'USED')}
                  style={[styles.segmentButton, active && styles.segmentButtonActive]}
                >
                  <Text style={[styles.segmentButtonText, active && styles.segmentButtonTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.sheetActions}>
            <Pressable
              onPress={() => {
                setCategory(undefined);
                setCity(undefined);
                setStore(undefined);
                setCondition(undefined);
                setMinPrice('');
                setMaxPrice('');
                setSort('newest');
              }}
              style={styles.resetButton}
            >
              <Text style={styles.resetButtonText}>Reset Filters</Text>
            </Pressable>
          </View>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F0F2F5',
    flex: 1,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 16,
    paddingHorizontal: 12,
    paddingTop: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  headerTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#1C1E21',
    fontSize: 22,
    fontWeight: '800',
  },
  headerSubtle: {
    color: '#65676B',
    fontSize: 12,
    marginTop: 4,
  },
  filterButton: {
    backgroundColor: '#E53935',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  searchInput: {
    backgroundColor: '#F5F6F7',
    borderColor: '#E4E6EB',
    borderRadius: 16,
    borderWidth: 1,
    color: '#1C1E21',
    fontSize: 15,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  suggestionBox: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E6EB',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suggestionText: {
    color: '#65676B',
    fontSize: 14,
  },
  discoveryStack: {
    gap: 10,
    marginTop: 10,
  },
  discoveryCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E6EB',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  discoveryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  discoveryTitle: {
    color: '#65676B',
    fontSize: 12,
    fontWeight: '700',
  },
  clearText: {
    color: '#E53935',
    fontSize: 12,
    fontWeight: '700',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  softChip: {
    backgroundColor: '#F5F6F7',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  softChipText: {
    color: '#65676B',
    fontSize: 12,
    fontWeight: '700',
  },
  popularChip: {
    backgroundColor: '#FDECEC',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  popularChipText: {
    color: '#E53935',
    fontSize: 12,
    fontWeight: '700',
  },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  sortChip: {
    backgroundColor: '#F5F6F7',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sortChipActive: {
    backgroundColor: '#E53935',
  },
  sortChipText: {
    color: '#65676B',
    fontSize: 12,
    fontWeight: '700',
  },
  sortChipTextActive: {
    color: '#FFFFFF',
  },
  nearbyBanner: {
    backgroundColor: '#FDECEC',
    borderRadius: 14,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  nearbyBannerText: {
    color: '#E53935',
    fontSize: 12,
    fontWeight: '700',
  },
  grid: {
    paddingBottom: 110,
    paddingHorizontal: 12,
    paddingTop: 14,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  emptyResults: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginTop: 8,
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  emptyResultsTitle: {
    color: '#1C1E21',
    fontSize: 18,
    fontWeight: '800',
  },
  emptyResultsText: {
    color: '#65676B',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  footerLoader: {
    paddingVertical: 16,
    width: '100%',
  },
  footerLoaderText: {
    color: '#65676B',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  sheet: {
    gap: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sheetTitle: {
    color: '#1C1E21',
    fontSize: 20,
    fontWeight: '800',
  },
  sheetLabel: {
    color: '#65676B',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  sheetChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E6EB',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sheetChipActive: {
    backgroundColor: '#E53935',
    borderColor: '#E53935',
  },
  sheetChipSpacing: {
    marginRight: 8,
  },
  sheetChipText: {
    color: '#65676B',
    fontSize: 12,
    fontWeight: '700',
  },
  sheetChipTextActive: {
    color: '#FFFFFF',
  },
  sheetRow: {
    flexDirection: 'row',
    gap: 10,
  },
  segmentButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E6EB',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 14,
  },
  segmentButtonActive: {
    backgroundColor: '#E53935',
    borderColor: '#E53935',
  },
  segmentButtonText: {
    color: '#65676B',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  segmentButtonTextActive: {
    color: '#FFFFFF',
  },
  priceInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E6EB',
    borderRadius: 16,
    borderWidth: 1,
    color: '#1C1E21',
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  priceInputSpacing: {
    marginRight: 2,
  },
  sheetActions: {
    marginTop: 4,
  },
  resetButton: {
    backgroundColor: '#F5F6F7',
    borderRadius: 16,
    paddingVertical: 14,
  },
  resetButtonText: {
    color: '#1C1E21',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});
