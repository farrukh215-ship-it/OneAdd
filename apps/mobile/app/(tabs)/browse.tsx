import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import type { Listing, SearchSuggestion } from '@tgmg/types';
import { ListingCard } from '../../components/ListingCard';
import { useCategories } from '../../hooks/useCategories';
import { useListings } from '../../hooks/useListings';
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
  const snapPoints = useMemo(() => ['65%'], []);
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
    const savedLocation = getLocationPreference();
    if (!params.city && savedLocation.city) {
      setCity(savedLocation.city);
    }
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

  return (
    <View className="flex-1 bg-bg">
      <View className="border-b border-border bg-white px-3 pb-3 pt-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-extrabold text-ink">{listingsQuery.data?.total ?? 0} listings mile</Text>
          <Pressable onPress={() => bottomSheetRef.current?.expand()} className="rounded-full bg-red px-4 py-2">
            <Text className="text-xs font-semibold text-white">Filters</Text>
          </Pressable>
        </View>

        <TextInput
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => submitSearch(q)}
          className="mt-3 rounded-xl border border-border bg-[#F5F6F7] px-4 py-3 text-ink"
          placeholder="Search with prediction..."
        />

        {suggestions.length ? (
          <View className="mt-2 rounded-xl border border-border bg-white">
            {suggestions.slice(0, 5).map((item, index) => (
              <Pressable key={`${item.label}-${index}`} onPress={() => submitSearch(item.label)} className="px-3 py-2">
                <Text className="text-sm text-ink2">{item.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : !q.trim() && (recentSearches.length || popularSearches.length) ? (
          <View className="mt-2 gap-2">
            {recentSearches.length ? (
              <View className="rounded-xl border border-border bg-white p-3">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-xs font-semibold text-ink2">Recent Searches</Text>
                  <Pressable
                    onPress={() => {
                      clearRecentSearches();
                      setRecentSearches([]);
                    }}
                  >
                    <Text className="text-xs font-semibold text-red">Clear</Text>
                  </Pressable>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  {recentSearches.map((item) => (
                    <Pressable key={item} onPress={() => submitSearch(item)} className="rounded-full bg-[#F5F6F7] px-3 py-2">
                      <Text className="text-xs font-semibold text-ink2">{item}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
            {popularSearches.length ? (
              <View className="rounded-xl border border-border bg-white p-3">
                <Text className="mb-2 text-xs font-semibold text-ink2">Popular</Text>
                <View className="flex-row flex-wrap gap-2">
                  {popularSearches.slice(0, 6).map((item, index) => (
                    <Pressable
                      key={`${item.label}-${index}`}
                      onPress={() => submitSearch(item.label)}
                      className="rounded-full bg-red/10 px-3 py-2"
                    >
                      <Text className="text-xs font-semibold text-red">{item.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        <View className="mt-3 flex-row gap-2">
          {[
            { value: 'newest', label: 'Newest' },
            { value: 'price_asc', label: 'Price Low' },
            { value: 'price_desc', label: 'Price High' },
          ].map((item) => (
            <Pressable
              key={item.value}
              onPress={() => setSort(item.value)}
              className={`rounded-full px-3 py-2 ${sort === item.value ? 'bg-red' : 'bg-[#F5F6F7]'}`}
            >
              <Text className={`text-xs font-semibold ${sort === item.value ? 'text-white' : 'text-ink2'}`}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {typeof lat === 'number' && typeof lng === 'number' ? (
          <View className="mt-2 rounded-xl bg-red/10 px-3 py-2">
            <Text className="text-xs font-semibold text-red">
              Mere paas mode: {radiusKm ?? 10} km ke andar listings pehle.
            </Text>
          </View>
        ) : null}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ paddingHorizontal: 8, paddingTop: 12, paddingBottom: 100 }}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
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
        ListFooterComponent={
          listingsQuery.isFetching && items.length ? (
            <View className="w-full py-4">
              <Text className="text-center text-xs font-semibold text-ink2">Aur listings load ho rahi hain...</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <ListingCard listing={item} onPress={() => router.push(`/listing/${item.id}`)} referenceCity={city || 'Lahore'} />
        )}
      />

      <BottomSheet ref={bottomSheetRef} index={-1} snapPoints={snapPoints} enablePanDownToClose>
        <BottomSheetView className="flex-1 gap-4 px-4 py-4">
          <Text className="text-lg font-bold text-ink">Browse Filters</Text>

          <View>
            <Text className="mb-2 text-sm font-semibold text-ink2">Category</Text>
            <FlatList
              horizontal
              data={categories}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => setCategory(item.slug)}
                  className={`mr-2 rounded-full px-3 py-2 ${
                    category === item.slug ? 'bg-red' : 'border border-border bg-white'
                  }`}
                >
                  <Text className={`text-xs font-semibold ${category === item.slug ? 'text-white' : 'text-ink2'}`}>
                    {item.icon} {item.name}
                  </Text>
                </Pressable>
              )}
            />
          </View>

          <View>
            <Text className="mb-2 text-sm font-semibold text-ink2">City</Text>
            <FlatList
              horizontal
              data={cities}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => setCity(item)}
                  className={`mr-2 rounded-full px-3 py-2 ${city === item ? 'bg-red' : 'border border-border bg-white'}`}
                >
                  <Text className={`text-xs font-semibold ${city === item ? 'text-white' : 'text-ink2'}`}>
                    {item}
                  </Text>
                </Pressable>
              )}
            />
          </View>

          <View>
            <Text className="mb-2 text-sm font-semibold text-ink2">Dukaan Type</Text>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setStore('online')}
                className={`rounded-full px-3 py-2 ${store === 'online' ? 'bg-red' : 'border border-border bg-white'}`}
              >
                <Text className={`text-xs font-semibold ${store === 'online' ? 'text-white' : 'text-ink2'}`}>Online</Text>
              </Pressable>
              <Pressable
                onPress={() => setStore('road')}
                className={`rounded-full px-3 py-2 ${store === 'road' ? 'bg-red' : 'border border-border bg-white'}`}
              >
                <Text className={`text-xs font-semibold ${store === 'road' ? 'text-white' : 'text-ink2'}`}>Road</Text>
              </Pressable>
            </View>
          </View>

          <View className="flex-row gap-3">
            <TextInput
              value={minPrice}
              onChangeText={setMinPrice}
              className="flex-1 rounded-xl border border-border bg-white px-4 py-3 text-ink"
              placeholder="Min price"
              keyboardType="numeric"
            />
            <TextInput
              value={maxPrice}
              onChangeText={setMaxPrice}
              className="flex-1 rounded-xl border border-border bg-white px-4 py-3 text-ink"
              placeholder="Max price"
              keyboardType="numeric"
            />
          </View>

          <View className="flex-row gap-2">
            {[
              { value: 'NEW', label: 'Naya' },
              { value: 'USED', label: 'Purana' },
            ].map((item) => (
              <Pressable
                key={item.value}
                onPress={() => setCondition(item.value as 'NEW' | 'USED')}
                className={`flex-1 rounded-xl px-4 py-3 ${
                  condition === item.value ? 'bg-red' : 'border border-border bg-white'
                }`}
              >
                <Text className={`text-center font-semibold ${condition === item.value ? 'text-white' : 'text-ink2'}`}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}
