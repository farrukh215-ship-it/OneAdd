import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from "react-native";
import { getCategoryCatalog, getListings } from "../services/api";
import { StaggerInCard } from "../components/stagger-in-card";
import { useScreenEnterAnimation } from "../hooks/use-screen-enter-animation";
import {
  getRecentlyViewedListingIds,
  getSavedListingIds,
  resolveListingsByIds,
  toggleSavedListingId
} from "../services/listing-preferences";
import type { Listing, MarketplaceCategory } from "../types";

const urduTagline =
  "\u062A\u06CC\u0631\u0627 \u062F\u0644 \u06A9\u0627 \u0633\u0627\u0645\u0627\u0646 - \u0645\u06CC\u0631\u06D2 \u06AF\u06BE\u0631 \u06A9\u0627 \u062D\u0635\u06C1";

function formatRelativeTime(input?: string) {
  if (!input) return "Just now";
  const createdAt = new Date(input);
  if (Number.isNaN(createdAt.getTime())) return "Just now";
  const diffSeconds = Math.floor((Date.now() - createdAt.getTime()) / 1000);
  if (diffSeconds < 60) return "Just now";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function getTrustBadge(score: number) {
  if (score >= 80) return "Asli Banda";
  if (score >= 50) return "Trusted Asli Banda";
  return "New Member";
}

function FeedSkeleton() {
  return (
    <View style={styles.skeletonWrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: 4 }).map((_, index) => (
        <View style={styles.skeletonCard} key={index}>
          <View style={styles.skeletonMedia} />
          <View style={styles.skeletonBody}>
            <View style={[styles.skeletonLine, styles.skeletonShort]} />
            <View style={[styles.skeletonLine, styles.skeletonLong]} />
            <View style={[styles.skeletonLine, styles.skeletonMid]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIllustration} />
      <Text style={styles.emptyTitle}>No listings yet</Text>
      <Text style={styles.emptySub}>Nayi listings jaldi nazar aayengi.</Text>
    </View>
  );
}

type HomeCardProps = {
  item: Listing;
  onPress: () => void;
  saved: boolean;
  onToggleSaved: () => void;
};

function HomeCard({ item, onPress, saved, onToggleSaved }: HomeCardProps) {
  const image = useMemo(() => item.media.find((media) => media.type === "IMAGE")?.url, [item.media]);
  const trustScore = item.user?.trustScore?.score ?? 0;
  const trustBadge = getTrustBadge(trustScore);

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPress}>
      {image ? (
        <Image source={{ uri: image }} style={styles.cardImage} resizeMode="cover" />
      ) : (
        <View style={styles.cardImagePlaceholder} />
      )}
      <View style={styles.cardBody}>
        <View style={styles.priceRow}>
          <Text style={styles.price}>
            {item.currency} {item.price}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.saveBtn, pressed && styles.cardPressed]}
            onPress={(event) => {
              event.stopPropagation?.();
              onToggleSaved();
            }}
          >
            <Text style={styles.saveBtnText}>{saved ? "Saved" : "Save"}</Text>
          </Pressable>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{item.city || "Pakistan"}</Text>
          <Text style={styles.metaDot}>|</Text>
          <Text style={styles.metaText}>{formatRelativeTime(item.createdAt)}</Text>
        </View>
        <View style={styles.trustPill}>
          <Text style={styles.trustText}>{trustBadge}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export function HomeScreen({ navigation }: any) {
  const enterStyle = useScreenEnterAnimation({ distance: 14, duration: 320 });
  const [items, setItems] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [savedItems, setSavedItems] = useState<Listing[]>([]);
  const [recentItems, setRecentItems] = useState<Listing[]>([]);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const selectedCategory =
    categories.find((item) => item.slug === selectedCategorySlug) ?? categories[0] ?? null;

  async function refreshLocalCollections(sourceItems: Listing[]) {
    const [nextSavedIds, nextRecentIds] = await Promise.all([
      getSavedListingIds(),
      getRecentlyViewedListingIds()
    ]);
    setSavedIds(nextSavedIds);

    const [resolvedSaved, resolvedRecent] = await Promise.all([
      resolveListingsByIds(nextSavedIds.slice(0, 8), sourceItems),
      resolveListingsByIds(nextRecentIds.slice(0, 8), sourceItems)
    ]);

    setSavedItems(resolvedSaved);
    setRecentItems(resolvedRecent);
  }

  async function loadAll(mode: "initial" | "refresh" = "initial") {
    if (mode === "initial") {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError("");

    try {
      const [listingData, categoryData] = await Promise.all([getListings(), getCategoryCatalog()]);
      setItems(listingData);
      setCategories(categoryData);
      await refreshLocalCollections(listingData);
      if (categoryData.length > 0) {
        setSelectedCategorySlug((prev) => prev || categoryData[0].slug);
      }
    } catch {
      setError("Feed load nahi hui. Dobara try karein.");
    } finally {
      if (mode === "initial") {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }

  useEffect(() => {
    void loadAll("initial");
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      void refreshLocalCollections(items);
    });
    return unsubscribe;
  }, [items, navigation]);

  async function onToggleSaved(listingId: string) {
    await toggleSavedListingId(listingId);
    await refreshLocalCollections(items);
  }

  return (
    <Animated.View style={[styles.screen, enterStyle]}>
      {loading ? (
        <FeedSkeleton />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          removeClippedSubviews
          windowSize={6}
          maxToRenderPerBatch={6}
          initialNumToRender={4}
          refreshing={refreshing}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void loadAll("refresh")} tintColor="#C8603A" />
          }
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={styles.heroCard}>
                <View style={styles.heroBrandRow}>
                  <Image
                    source={require("../../assets/tgmg-mark.png")}
                    style={styles.heroMarkLogo}
                    resizeMode="cover"
                  />
                  <Text style={styles.heroBrandName}>TeraGharMeraGhar</Text>
                </View>
                <Image source={require("../../assets/tgmg-full.png")} style={styles.heroLogoFull} resizeMode="contain" />
                <Text style={styles.heroTitle}>Tera Ghar Mera Ghar</Text>
                <Text style={styles.heroSub}>Pakistan ka pehla real-person used marketplace</Text>
                <Text style={styles.heroUrdu}>{urduTagline}</Text>
              </View>

              <Text style={styles.kicker}>CATEGORIES</Text>
              <View style={styles.categoryGrid}>
                {categories.map((item) => (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [
                      styles.categoryCard,
                      selectedCategory?.slug === item.slug ? styles.categoryCardActive : null,
                      pressed && styles.cardPressed
                    ]}
                    onPress={() => setSelectedCategorySlug(item.slug)}
                  >
                    <Text style={styles.categoryIcon}>{item.icon}</Text>
                    <Text style={styles.categoryName}>{item.name}</Text>
                  </Pressable>
                ))}
              </View>

              {selectedCategory ? (
                <View style={styles.subcatPanel}>
                  <Pressable
                    style={({ pressed }) => [styles.viewAllRow, pressed && styles.cardPressed]}
                    onPress={() =>
                      navigation.navigate("Dhundo", {
                        presetCategory: selectedCategory.slug,
                        presetQuery: "",
                        categoryLabel: selectedCategory.name
                      })
                    }
                  >
                    <Text style={styles.viewAllText}>View All in {selectedCategory.name}</Text>
                  </Pressable>
                  {selectedCategory.subcategories.map((sub) => (
                    <Pressable
                      key={sub.id}
                      style={({ pressed }) => [styles.subcatRow, pressed && styles.cardPressed]}
                      onPress={() =>
                        navigation.navigate("Dhundo", {
                          presetCategory: sub.slug,
                          presetQuery: sub.name,
                          categoryLabel: `${selectedCategory.name} / ${sub.name}`
                        })
                      }
                    >
                      <Text style={styles.subcatText}>{sub.name}</Text>
                      <Text style={styles.subcatArrow}>{">"}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <Text style={styles.headerTitle}>Latest Listings</Text>

              {savedItems.length > 0 ? (
                <View style={styles.collectionBlock}>
                  <Text style={styles.collectionTitle}>Saved Adds</Text>
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={savedItems}
                    keyExtractor={(item) => `saved-${item.id}`}
                    contentContainerStyle={styles.collectionList}
                    renderItem={({ item }) => (
                      <Pressable
                        style={({ pressed }) => [styles.collectionCard, pressed && styles.cardPressed]}
                        onPress={() => navigation.navigate("ListingDetail", { id: item.id })}
                      >
                        <Text style={styles.collectionPrice}>
                          {item.currency} {item.price}
                        </Text>
                        <Text style={styles.collectionText} numberOfLines={2}>
                          {item.title}
                        </Text>
                      </Pressable>
                    )}
                  />
                </View>
              ) : null}

              {recentItems.length > 0 ? (
                <View style={styles.collectionBlock}>
                  <Text style={styles.collectionTitle}>Recently Viewed</Text>
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={recentItems}
                    keyExtractor={(item) => `recent-${item.id}`}
                    contentContainerStyle={styles.collectionList}
                    renderItem={({ item }) => (
                      <Pressable
                        style={({ pressed }) => [styles.collectionCard, pressed && styles.cardPressed]}
                        onPress={() => navigation.navigate("ListingDetail", { id: item.id })}
                      >
                        <Text style={styles.collectionPrice}>
                          {item.currency} {item.price}
                        </Text>
                        <Text style={styles.collectionText} numberOfLines={2}>
                          {item.title}
                        </Text>
                      </Pressable>
                    )}
                  />
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={error ? <Text style={styles.error}>{error}</Text> : <EmptyState />}
          renderItem={({ item, index }) => (
            <StaggerInCard index={index} delayBase={100} delayStep={36}>
              <HomeCard
                item={item}
                saved={savedIds.includes(item.id)}
                onToggleSaved={() => void onToggleSaved(item.id)}
                onPress={() => navigation.navigate("ListingDetail", { id: item.id })}
              />
            </StaggerInCard>
          )}
        />
      )}
      {!loading && refreshing ? (
        <View style={styles.refreshOverlay}>
          <ActivityIndicator size="small" color="#C8603A" />
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FDF6ED"
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 22,
    paddingTop: 10
  },
  header: {
    marginBottom: 16
  },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8D5B7",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12
  },
  heroBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8
  },
  heroMarkLogo: {
    width: 34,
    height: 34,
    borderRadius: 10
  },
  heroBrandName: {
    fontSize: 18,
    lineHeight: 22,
    color: "#5C3D2E",
    fontWeight: "800"
  },
  heroLogoFull: {
    width: "100%",
    height: 120
  },
  heroTitle: {
    marginTop: 4,
    fontSize: 29,
    lineHeight: 34,
    color: "#5C3D2E",
    fontWeight: "800"
  },
  heroSub: {
    marginTop: 6,
    color: "#7A5544",
    fontSize: 14,
    lineHeight: 20
  },
  heroUrdu: {
    marginTop: 8,
    color: "#5C3D2E",
    fontSize: 15,
    lineHeight: 26,
    textAlign: "right"
  },
  kicker: {
    color: "#C8603A",
    fontSize: 11,
    letterSpacing: 1.6,
    fontWeight: "800",
    marginBottom: 8
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  categoryCard: {
    width: "23%",
    minWidth: 72,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8D5B7",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 4
  },
  categoryCardActive: {
    borderColor: "#C8603A",
    backgroundColor: "#FFF7F3"
  },
  categoryIcon: {
    fontSize: 22
  },
  categoryName: {
    marginTop: 4,
    textAlign: "center",
    fontSize: 10,
    lineHeight: 13,
    color: "#5C3D2E",
    fontWeight: "700"
  },
  subcatPanel: {
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8D5B7",
    borderRadius: 14
  },
  viewAllRow: {
    borderBottomWidth: 1,
    borderBottomColor: "#EFE2CF",
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  viewAllText: {
    color: "#4F6FCE",
    fontWeight: "700",
    fontSize: 16
  },
  subcatRow: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3E7D9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  subcatText: {
    color: "#243233",
    fontSize: 16
  },
  subcatArrow: {
    color: "#415455",
    fontSize: 20,
    fontWeight: "700"
  },
  headerTitle: {
    marginTop: 14,
    fontSize: 34,
    lineHeight: 38,
    color: "#5C3D2E",
    fontWeight: "800"
  },
  collectionBlock: {
    marginTop: 14
  },
  collectionTitle: {
    color: "#5C3D2E",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8
  },
  collectionList: {
    gap: 10
  },
  collectionCard: {
    width: 160,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8D5B7",
    padding: 10
  },
  collectionPrice: {
    color: "#C8603A",
    fontSize: 14,
    fontWeight: "800"
  },
  collectionText: {
    marginTop: 6,
    color: "#5C3D2E",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600"
  },
  card: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8D5B7",
    shadowColor: "#5C3D2E",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 3
  },
  cardPressed: {
    transform: [{ scale: 0.992 }],
    opacity: 0.96
  },
  cardImage: {
    width: "100%",
    height: 220
  },
  cardImagePlaceholder: {
    width: "100%",
    height: 220,
    backgroundColor: "#F5EAD8"
  },
  cardBody: {
    padding: 14
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8
  },
  price: {
    fontSize: 24,
    lineHeight: 28,
    color: "#C8603A",
    fontWeight: "800"
  },
  saveBtn: {
    borderWidth: 1,
    borderColor: "#E8D5B7",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  saveBtnText: {
    color: "#5C3D2E",
    fontSize: 11,
    fontWeight: "700"
  },
  title: {
    marginTop: 6,
    fontSize: 16,
    lineHeight: 22,
    color: "#5C3D2E",
    fontWeight: "700"
  },
  metaRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center"
  },
  metaText: {
    color: "#9B8070",
    fontSize: 13
  },
  metaDot: {
    marginHorizontal: 8,
    color: "#D4B896"
  },
  trustPill: {
    marginTop: 10,
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(61,107,79,0.3)",
    backgroundColor: "rgba(61,107,79,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  trustText: {
    color: "#3D6B4F",
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: "700"
  },
  error: {
    color: "#b42040",
    marginTop: 10
  },
  skeletonWrap: {
    paddingHorizontal: 14,
    paddingTop: 12
  },
  skeletonCard: {
    borderRadius: 22,
    backgroundColor: "#ffffff",
    marginBottom: 16,
    overflow: "hidden"
  },
  skeletonMedia: {
    height: 220,
    backgroundColor: "#F5EAD8"
  },
  skeletonBody: {
    padding: 14
  },
  skeletonLine: {
    height: 13,
    borderRadius: 999,
    backgroundColor: "#F5EAD8",
    marginBottom: 8
  },
  skeletonShort: {
    width: "44%"
  },
  skeletonMid: {
    width: "61%"
  },
  skeletonLong: {
    width: "87%"
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 56
  },
  emptyIllustration: {
    width: 110,
    height: 84,
    borderRadius: 16,
    backgroundColor: "#F5EAD8"
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    color: "#5C3D2E",
    fontWeight: "700"
  },
  emptySub: {
    marginTop: 6,
    color: "#9B8070"
  },
  refreshOverlay: {
    position: "absolute",
    top: 12,
    left: 0,
    right: 0,
    alignItems: "center"
  }
});
