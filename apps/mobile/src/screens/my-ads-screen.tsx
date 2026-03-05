import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from "react-native";
import { AuthRequiredCard } from "../components/auth-required-card";
import { useScreenEnterAnimation } from "../hooks/use-screen-enter-animation";
import {
  activateListing,
  deactivateListing,
  getAuthToken,
  getMyListings,
  markListingSold,
  relistListing,
  subscribeAuthToken
} from "../services/api";
import type { Listing } from "../types";
import { displayCategoryPath, displayListedDate, displayLocation } from "../theme/ui-contract";
import { uiTheme } from "../theme/tokens";

const LEGACY_MEDIA_HOSTS = new Set(["zaroratbazar.shop", "www.zaroratbazar.shop", "api", "localhost"]);
const FALLBACK_ORIGIN = "https://www.teragharmeraghar.com";

function resolveMediaUrl(rawUrl?: string | null) {
  const trimmed = rawUrl?.trim?.() ?? "";
  if (!trimmed) {
    return "";
  }
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) {
    return `${FALLBACK_ORIGIN}${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    if (LEGACY_MEDIA_HOSTS.has(parsed.hostname.toLowerCase())) {
      return `${FALLBACK_ORIGIN}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

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

function statusLabel(status?: string) {
  return (status || "ACTIVE").replace(/_/g, " ");
}

export function MyAdsScreen({ navigation }: any) {
  const enterStyle = useScreenEnterAnimation({ distance: 12, duration: 300 });
  const [token, setToken] = useState(getAuthToken());
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [busyListingId, setBusyListingId] = useState("");

  useEffect(() => {
    return subscribeAuthToken((nextToken) => {
      setToken(nextToken);
    });
  }, []);

  async function loadMyAds(mode: "initial" | "refresh" = "initial") {
    if (!token) {
      setItems([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (mode === "initial") {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError("");
    try {
      const listings = await getMyListings();
      setItems(dedupeByListingId(listings));
    } catch {
      setError("Mere ads load nahi huay. Dobara try karein.");
    } finally {
      if (mode === "initial") {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }

  useEffect(() => {
    void loadMyAds("initial");
  }, [token]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      void loadMyAds("refresh");
    });
    return unsubscribe;
  }, [navigation, token]);

  const grouped = useMemo(() => {
    const active = items.filter((item) => item.status === "ACTIVE");
    const draft = items.filter((item) => item.status === "DRAFT");
    const paused = items.filter((item) => item.status === "PAUSED");
    const sold = items.filter((item) => item.status === "SOLD");
    const expired = items.filter((item) => item.status === "EXPIRED");
    return [...active, ...draft, ...paused, ...sold, ...expired];
  }, [items]);

  async function performAction(
    listingId: string,
    action: "sold" | "deactivate" | "activate" | "relist"
  ) {
    setBusyListingId(listingId);
    setError("");
    try {
      if (action === "sold") {
        await markListingSold(listingId);
      } else if (action === "deactivate") {
        await deactivateListing(listingId);
      } else if (action === "activate") {
        await activateListing(listingId);
      } else {
        await relistListing(listingId);
      }
      await loadMyAds("refresh");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action fail ho gaya.");
    } finally {
      setBusyListingId("");
    }
  }

  function confirmAction(
    listingId: string,
    action: "sold" | "deactivate" | "activate" | "relist"
  ) {
    const labels = {
      sold: "Mark as SOLD",
      deactivate: "Deactivate",
      activate: "Activate",
      relist: "Relist"
    };
    Alert.alert(labels[action], "Kya aap confirm karte hain?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes",
        style: "default",
        onPress: () => {
          void performAction(listingId, action);
        }
      }
    ]);
  }

  if (!token) {
    return (
      <AuthRequiredCard
        navigation={navigation}
        title="Mere Ads ke liye login zaroori hai"
        subtitle="Login ke baad aap apne ads edit, sold, deactivate aur relist kar sakte hain."
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={uiTheme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, enterStyle]}>
      <View style={styles.header}>
        <Text style={styles.title}>Mere Ads</Text>
        <Text style={styles.sub}>Active, sold, paused aur expired ads yahan se manage karein.</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={grouped}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadMyAds("refresh")}
            tintColor={uiTheme.colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Abhi koi ad nahi</Text>
            <Text style={styles.emptySub}>Becho tab se naya ad create karein.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const thumbRaw = item.media.find((media) => media.type === "IMAGE")?.url;
          const thumb = resolveMediaUrl(thumbRaw);
          const isBusy = busyListingId === item.id;
          const location = displayLocation({
            city: item.city,
            exactLocation: item.exactLocation,
            description: item.description
          });

          return (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              onPress={() => navigation.navigate("ListingDetail", { id: item.id })}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.thumbWrap}>
                  {thumb ? (
                    <Image source={{ uri: thumb }} style={styles.thumbImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.thumbFallback} />
                  )}
                </View>
                <View style={styles.mainInfo}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.price} numberOfLines={1}>
                      {item.currency} {item.price}
                    </Text>
                    <Text style={styles.statusPill}>{statusLabel(item.status)}</Text>
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  {displayCategoryPath(item.mainCategoryName, item.subCategoryName) ? (
                    <Text style={styles.meta} numberOfLines={1}>
                      {displayCategoryPath(item.mainCategoryName, item.subCategoryName)}
                    </Text>
                  ) : null}
                  <Text style={styles.meta} numberOfLines={1}>
                    {location}
                  </Text>
                  <Text style={styles.meta}>{displayListedDate(item.createdAt)}</Text>
                </View>
              </View>

              <View style={styles.actionsRow}>
                <Pressable
                  style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                  onPress={() => navigation.navigate("Becho", { editListingId: item.id })}
                >
                  <Text style={styles.actionBtnText}>Edit</Text>
                </Pressable>

                {item.status === "ACTIVE" ? (
                  <>
                    <Pressable
                      style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                      onPress={() => confirmAction(item.id, "sold")}
                      disabled={isBusy}
                    >
                      <Text style={styles.actionBtnText}>Mark Sold</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                      onPress={() => confirmAction(item.id, "deactivate")}
                      disabled={isBusy}
                    >
                      <Text style={styles.actionBtnText}>Deactivate</Text>
                    </Pressable>
                  </>
                ) : null}

                {item.status === "PAUSED" || item.status === "DRAFT" ? (
                  <Pressable
                    style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                    onPress={() => confirmAction(item.id, "activate")}
                    disabled={isBusy}
                  >
                    <Text style={styles.actionBtnText}>Activate</Text>
                  </Pressable>
                ) : null}

                {item.status === "SOLD" || item.status === "EXPIRED" ? (
                  <Pressable
                    style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                    onPress={() => confirmAction(item.id, "relist")}
                    disabled={isBusy}
                  >
                    <Text style={styles.actionBtnText}>Relist</Text>
                  </Pressable>
                ) : null}
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: uiTheme.colors.surfaceAlt,
    paddingHorizontal: uiTheme.spacing.md,
    paddingTop: uiTheme.spacing.md
  },
  loading: {
    flex: 1,
    backgroundColor: uiTheme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center"
  },
  header: {
    marginBottom: uiTheme.spacing.sm
  },
  title: {
    color: uiTheme.colors.textStrong,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800"
  },
  sub: {
    color: uiTheme.colors.textMuted,
    marginTop: 4,
    fontSize: 13
  },
  error: {
    color: uiTheme.colors.danger,
    marginBottom: uiTheme.spacing.sm
  },
  listContent: {
    paddingBottom: uiTheme.spacing.lg
  },
  card: {
    backgroundColor: uiTheme.colors.surface,
    borderRadius: uiTheme.radius.md,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    padding: uiTheme.spacing.md,
    marginBottom: uiTheme.spacing.sm
  },
  cardTopRow: {
    flexDirection: "row",
    gap: uiTheme.spacing.md
  },
  thumbWrap: {
    width: 96,
    aspectRatio: 4 / 3,
    borderRadius: uiTheme.radius.sm,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    backgroundColor: uiTheme.colors.surfaceSoft
  },
  thumbImage: {
    width: "100%",
    height: "100%"
  },
  thumbFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: uiTheme.colors.surfaceSoft
  },
  mainInfo: {
    flex: 1
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: uiTheme.spacing.sm
  },
  price: {
    color: uiTheme.colors.primary,
    fontSize: 18,
    fontWeight: "800",
    flexShrink: 1
  },
  statusPill: {
    color: uiTheme.colors.textStrong,
    fontSize: 11,
    fontWeight: "700",
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    backgroundColor: uiTheme.colors.surfaceAlt,
    borderRadius: uiTheme.radius.pill,
    paddingHorizontal: uiTheme.spacing.sm,
    paddingVertical: 4
  },
  cardTitle: {
    marginTop: 6,
    color: uiTheme.colors.textStrong,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700"
  },
  meta: {
    marginTop: 4,
    color: uiTheme.colors.textMuted,
    fontSize: 12
  },
  actionsRow: {
    marginTop: uiTheme.spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: uiTheme.spacing.sm
  },
  actionBtn: {
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    backgroundColor: uiTheme.colors.surface,
    borderRadius: uiTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  actionBtnText: {
    color: uiTheme.colors.textStrong,
    fontSize: 12,
    fontWeight: "700"
  },
  emptyCard: {
    marginTop: 6,
    backgroundColor: uiTheme.colors.surface,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    borderRadius: uiTheme.radius.md,
    padding: uiTheme.spacing.md
  },
  emptyTitle: {
    color: uiTheme.colors.textStrong,
    fontSize: 15,
    fontWeight: "700"
  },
  emptySub: {
    marginTop: 4,
    color: uiTheme.colors.textMuted,
    fontSize: 12
  },
  pressed: {
    opacity: 0.93,
    transform: [{ scale: 0.99 }]
  }
});
