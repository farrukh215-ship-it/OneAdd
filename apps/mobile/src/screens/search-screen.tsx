import { useEffect, useMemo, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import {
  getCategoryCatalog,
  getSearchSuggestions,
  semanticSearchListingsWithFilters
} from "../services/api";
import { StaggerInCard } from "../components/stagger-in-card";
import { useScreenEnterAnimation } from "../hooks/use-screen-enter-animation";
import {
  getRecentlyViewedListingIds,
  getSavedListingIds,
  resolveListingsByIds,
  toggleSavedListingId
} from "../services/listing-preferences";
import type { Listing, MarketplaceCategory, SearchSuggestion } from "../types";
import { displayCategoryPath, displayLocation } from "../theme/ui-contract";
import { uiTheme } from "../theme/tokens";

const sortOptions = [
  { value: "relevance", label: "Best Match" },
  { value: "price_asc", label: "Price Low" },
  { value: "price_desc", label: "Price High" },
  { value: "date_desc", label: "Newest" }
] as const;

function dedupeByListingId(source: Listing[]) {
  const seen = new Set<string>();
  const unique: Listing[] = [];
  source.forEach((item) => {
    if (!item.id || seen.has(item.id)) {
      return;
    }
    seen.add(item.id);
    unique.push(item);
  });
  return unique;
}

function getPrimaryImage(listing: Listing) {
  return listing.media.find((item) => item.type === "IMAGE" && item.url)?.url ?? "";
}

export function SearchScreen({ navigation, route }: any) {
  const enterStyle = useScreenEnterAnimation({ distance: 14, duration: 320 });
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [sortBy, setSortBy] = useState<(typeof sortOptions)[number]["value"]>("relevance");
  const [items, setItems] = useState<Listing[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [recentItems, setRecentItems] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const selectedRoot = useMemo(() => {
    const asRoot = categories.find((item) => item.slug === selectedCategorySlug);
    if (asRoot) {
      return asRoot;
    }
    return categories.find((item) => item.subcategories.some((sub) => sub.slug === selectedCategorySlug));
  }, [categories, selectedCategorySlug]);
  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];
    if (selectedRoot?.name) labels.push(selectedRoot.name);
    if (city.trim()) labels.push(city.trim());
    if (area.trim()) labels.push(area.trim());
    if (query.trim()) labels.push(`"${query.trim()}"`);
    return labels;
  }, [area, city, query, selectedRoot?.name]);

  useEffect(() => {
    void getCategoryCatalog().then(setCategories).catch(() => setCategories([]));
  }, []);

  async function refreshLocalCollections(sourceItems: Listing[]) {
    const [nextSavedIds, nextRecentIds] = await Promise.all([
      getSavedListingIds(),
      getRecentlyViewedListingIds()
    ]);
    setSavedIds(nextSavedIds);
    const resolvedRecent = await resolveListingsByIds(nextRecentIds.slice(0, 8), sourceItems);
    setRecentItems(resolvedRecent);
  }

  useEffect(() => {
    const presetQuery = route?.params?.presetQuery;
    const presetCategory = route?.params?.presetCategory;

    if (typeof presetQuery === "string") {
      setQuery(presetQuery);
    }
    if (typeof presetCategory === "string") {
      setSelectedCategorySlug(presetCategory);
    }
  }, [route?.params?.presetCategory, route?.params?.presetQuery]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      setSuggestionsLoading(true);
      void getSearchSuggestions(q, 8)
        .then((rows) => {
          setSuggestions(rows);
        })
        .catch(() => setSuggestions([]))
        .finally(() => setSuggestionsLoading(false));
    }, 140);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    const normalizedCategory = selectedCategorySlug.trim();

    const normalizedCity = city.trim();
    const normalizedArea = area.trim();

    if (!normalizedQuery && !normalizedCategory && !normalizedCity && !normalizedArea) {
      setItems([]);
      return;
    }

    const handle = setTimeout(() => {
      void semanticSearchListingsWithFilters({
        query: normalizedQuery,
        category: normalizedCategory,
        city: normalizedCity,
        area: normalizedArea,
        sortBy
      })
        .then((result) => setItems(dedupeByListingId(result)))
        .catch(() => setItems([]));
    }, 250);

    return () => clearTimeout(handle);
  }, [area, city, query, selectedCategorySlug, sortBy]);

  useEffect(() => {
    void refreshLocalCollections(items);
  }, [items]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      void refreshLocalCollections(items);
    });
    return unsubscribe;
  }, [items, navigation]);

  async function onToggleSaved(listingId: string) {
    await toggleSavedListingId(listingId);
    const nextSavedIds = await getSavedListingIds();
    setSavedIds(nextSavedIds);
  }

  function onSuggestionPress(item: SearchSuggestion) {
    setSuggestionsOpen(false);
    const href = item.href || "";
    if (!href.includes("?")) {
      if (item.type === "listing") {
        const listingId = item.href.split("/").pop();
        if (listingId) {
          navigation.navigate("ListingDetail", { id: listingId });
        }
      }
      setQuery(item.label);
      return;
    }

    const queryString = href.split("?")[1] ?? "";
    const parsed: Record<string, string> = {};
    queryString.split("&").forEach((part) => {
      const [rawKey, rawValue] = part.split("=");
      if (!rawKey) return;
      parsed[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue ?? "");
    });

    const nextQuery = parsed.q ?? item.label;
    const nextCategory = parsed.category ?? "";
    const nextCity = parsed.city ?? "";
    const nextArea = parsed.area ?? "";
    setQuery(nextQuery);
    setSelectedCategorySlug(nextCategory);
    setCity(nextCity);
    setArea(nextArea);
  }

  return (
    <Animated.View style={[styles.screen, enterStyle]}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Dhundo</Text>
        <Text style={styles.heroSub}>Real people ki verified listings, seedha aur fast search.</Text>
      </View>

      <View style={styles.searchShell}>
        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>{"\ud83d\udd0d"}</Text>
          <TextInput
            style={styles.input}
            placeholder="Dhundo listings..."
            value={query}
            onFocus={() => setSuggestionsOpen(true)}
            onBlur={() => {
              setTimeout(() => setSuggestionsOpen(false), 120);
            }}
            onChangeText={setQuery}
          />
        </View>
        {activeFilterLabels.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeFilterRow}>
            {activeFilterLabels.map((label) => (
              <View key={label} style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>{label}</Text>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>
      {suggestionsOpen && (suggestionsLoading || suggestions.length > 0) ? (
        <View style={styles.suggestionMenu}>
          {suggestionsLoading ? (
            <Text style={styles.suggestionMeta}>Searching...</Text>
          ) : (
            suggestions.map((item) => (
              <Pressable
                key={`${item.type}-${item.id}`}
                style={({ pressed }) => [styles.suggestionItem, pressed && styles.pressed]}
                onPress={() => onSuggestionPress(item)}
              >
                <Text style={styles.suggestionLabel} numberOfLines={1}>
                  {item.label}
                </Text>
                <Text style={styles.suggestionMeta}>{item.meta || item.type}</Text>
              </Pressable>
            ))
          )}
        </View>
      ) : null}
      <View style={styles.inlineFilters}>
        <TextInput
          style={[styles.input, styles.filterInput]}
          placeholder="City (e.g. Lahore)"
          value={city}
          onChangeText={setCity}
        />
        <TextInput
          style={[styles.input, styles.filterInput]}
          placeholder="Area (DHA, Johar...)"
          value={area}
          onChangeText={setArea}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
        {sortOptions.map((option) => {
          const selected = sortBy === option.value;
          return (
            <Pressable
              key={option.value}
              style={({ pressed }) => [
                styles.subchip,
                selected ? styles.subchipActive : null,
                pressed ? styles.pressed : null
              ]}
              onPress={() => setSortBy(option.value)}
            >
              <Text style={styles.subchipText}>{option.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {categories.map((category) => {
          const selected =
            selectedCategorySlug === category.slug ||
            category.subcategories.some((sub) => sub.slug === selectedCategorySlug);
          return (
            <Pressable
              key={category.id}
              style={({ pressed }) => [styles.chip, selected && styles.chipActive, pressed && styles.pressed]}
              onPress={() => setSelectedCategorySlug((prev) => (prev === category.slug ? "" : category.slug))}
            >
              <Text style={styles.chipText}>
                {category.icon} {category.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {selectedRoot ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subchipsRow}>
          {selectedRoot.subcategories.map((sub) => {
            const selected = selectedCategorySlug === sub.slug;
            return (
              <Pressable
                key={sub.id}
                style={({ pressed }) => [
                  styles.subchip,
                  selected && styles.subchipActive,
                  pressed && styles.pressed
                ]}
                onPress={() => setSelectedCategorySlug(selected ? selectedRoot.slug : sub.slug)}
              >
                <Text style={styles.subchipText}>{sub.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {recentItems.length > 0 ? (
        <View style={styles.quickBlock}>
          <Text style={styles.quickTitle}>Recently Viewed</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={recentItems}
            keyExtractor={(item) => `recent-${item.id}`}
            contentContainerStyle={styles.quickList}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}
                onPress={() => navigation.navigate("ListingDetail", { id: item.id })}
              >
                <Text style={styles.quickPrice}>
                  {item.currency} {item.price}
                </Text>
                <Text style={styles.quickText} numberOfLines={2}>
                  {item.title}
                </Text>
              </Pressable>
            )}
          />
        </View>
      ) : null}

      <View style={styles.resultsSummaryCard}>
        <View>
          <Text style={styles.resultsSummaryTitle}>Results</Text>
          <Text style={styles.resultsSummaryMeta}>
            {items.length} matches • {sortOptions.find((option) => option.value === sortBy)?.label ?? "Best Match"}
          </Text>
        </View>
        <View style={styles.resultsSummaryBadge}>
          <Text style={styles.resultsSummaryBadgeText}>Premium search</Text>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          query.trim().length > 0 || selectedCategorySlug || city.trim().length > 0 || area.trim().length > 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Koi listing nahi mili</Text>
              <Text style={styles.emptySub}>Dusra keyword try karein, ya category change karein.</Text>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Search start karein</Text>
              <Text style={styles.emptySub}>Category select karein ya apna keyword likhein.</Text>
            </View>
          )
        }
        renderItem={({ item, index }) => (
          <StaggerInCard index={index} delayBase={80} delayStep={34}>
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              onPress={() => navigation.navigate("ListingDetail", { id: item.id })}
            >
              <View style={styles.cardTopRow}>
                {getPrimaryImage(item) ? (
                  <View style={styles.resultThumbWrap}>
                    <Image source={{ uri: getPrimaryImage(item) }} style={styles.resultThumb} resizeMode="contain" />
                  </View>
                ) : (
                  <View style={styles.resultThumbWrap} />
                )}
                <View style={styles.resultBody}>
                  <View style={styles.priceRow}>
                    <Text style={styles.price}>
                      {item.currency} {item.price}
                    </Text>
                    <Pressable
                      style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}
                      onPress={(event) => {
                        event.stopPropagation?.();
                        void onToggleSaved(item.id);
                      }}
                    >
                      <Text style={styles.saveBtnText}>{savedIds.includes(item.id) ? "Saved" : "Save"}</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.title}>{item.title}</Text>
                  {displayCategoryPath(item.mainCategoryName, item.subCategoryName) ? (
                    <Text style={styles.meta}>
                      {displayCategoryPath(item.mainCategoryName, item.subCategoryName)}
                    </Text>
                  ) : null}
                  <Text style={styles.meta}>
                    {displayLocation({
                      city: item.city,
                      exactLocation: item.exactLocation,
                      description: item.description
                    })}
                  </Text>
                </View>
              </View>
            </Pressable>
          </StaggerInCard>
        )}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    backgroundColor: uiTheme.colors.surfaceAlt
  },
  hero: {
    marginBottom: 10,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    backgroundColor: uiTheme.colors.surfaceRaised,
    ...uiTheme.elevation.sm
  },
  heroTitle: {
    color: uiTheme.colors.textStrong,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800"
  },
  heroSub: {
    color: uiTheme.colors.textMuted,
    fontSize: 13,
    marginTop: 4
  },
  searchRow: {
    backgroundColor: uiTheme.colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center"
  },
  searchShell: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    backgroundColor: uiTheme.colors.surfaceRaised,
    ...uiTheme.elevation.sm
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 6
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    color: uiTheme.colors.textStrong
  },
  suggestionMenu: {
    marginTop: -2,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    borderRadius: 12,
    backgroundColor: uiTheme.colors.surface,
    overflow: "hidden"
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: uiTheme.colors.border
  },
  suggestionLabel: {
    color: uiTheme.colors.textStrong,
    fontSize: 13,
    fontWeight: "700"
  },
  suggestionMeta: {
    marginTop: 2,
    color: uiTheme.colors.textMuted,
    fontSize: 11
  },
  chipsRow: {
    gap: 8,
    paddingBottom: 8
  },
  inlineFilters: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8
  },
  activeFilterRow: {
    gap: 8,
    paddingTop: 10
  },
  activeFilterChip: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: uiTheme.colors.primaryGlow,
    borderWidth: 1,
    borderColor: "rgba(200,96,58,0.16)",
    justifyContent: "center"
  },
  activeFilterText: {
    color: uiTheme.colors.primaryDark,
    fontSize: 11,
    fontWeight: "700"
  },
  filterInput: {
    flex: 1,
    marginBottom: 0
  },
  sortRow: {
    gap: 8,
    paddingBottom: 10
  },
  chip: {
    backgroundColor: uiTheme.colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  chipActive: {
    borderColor: uiTheme.colors.primary,
    backgroundColor: "#FFF7F3"
  },
  chipText: {
    color: uiTheme.colors.textSoft,
    fontSize: 12,
    fontWeight: "700"
  },
  subchipsRow: {
    gap: 8,
    paddingBottom: 10
  },
  subchip: {
    backgroundColor: uiTheme.colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  subchipActive: {
    borderColor: uiTheme.colors.primary,
    backgroundColor: "#FFF7F3"
  },
  subchipText: {
    color: uiTheme.colors.textStrong,
    fontSize: 12,
    fontWeight: "700"
  },
  quickBlock: {
    marginBottom: 12
  },
  quickTitle: {
    color: uiTheme.colors.textStrong,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8
  },
  quickList: {
    gap: 10
  },
  quickCard: {
    width: 164,
    backgroundColor: uiTheme.colors.surface,
    borderColor: uiTheme.colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10
  },
  quickPrice: {
    color: uiTheme.colors.primary,
    fontSize: 14,
    fontWeight: "800"
  },
  quickText: {
    marginTop: 6,
    color: uiTheme.colors.textStrong,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600"
  },
  listContent: {
    paddingBottom: 18
  },
  card: {
    backgroundColor: uiTheme.colors.surface,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    ...uiTheme.elevation.sm
  },
  cardTopRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start"
  },
  resultThumbWrap: {
    width: 84,
    height: 84,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    backgroundColor: uiTheme.colors.surfaceSoft,
    overflow: "hidden",
    padding: 8
  },
  resultThumb: {
    width: "100%",
    height: "100%"
  },
  resultBody: {
    flex: 1,
    gap: 2
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8
  },
  price: {
    color: uiTheme.colors.primary,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 2
  },
  saveBtn: {
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    backgroundColor: uiTheme.colors.surface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  saveBtnText: {
    color: uiTheme.colors.textStrong,
    fontSize: 11,
    fontWeight: "700"
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: uiTheme.colors.textStrong
  },
  meta: {
    marginTop: 4,
    color: uiTheme.colors.textMuted,
    fontSize: 12
  },
  emptyCard: {
    backgroundColor: uiTheme.colors.surface,
    borderColor: uiTheme.colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 8
  },
  emptyTitle: {
    color: uiTheme.colors.textStrong,
    fontSize: 15,
    fontWeight: "700"
  },
  emptySub: {
    color: uiTheme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18
  },
  resultsSummaryCard: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    backgroundColor: uiTheme.colors.surfaceRaised,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  resultsSummaryTitle: {
    color: uiTheme.colors.textStrong,
    fontSize: 14,
    fontWeight: "800"
  },
  resultsSummaryMeta: {
    marginTop: 2,
    color: uiTheme.colors.textMuted,
    fontSize: 12
  },
  resultsSummaryBadge: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: uiTheme.colors.primaryGlow,
    justifyContent: "center"
  },
  resultsSummaryBadgeText: {
    color: uiTheme.colors.primaryDark,
    fontSize: 11,
    fontWeight: "800"
  },
  pressed: {
    opacity: 0.93,
    transform: [{ scale: 0.99 }]
  }
});
