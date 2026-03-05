import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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

function formatListedDate(input?: string) {
  if (!input) return "Listed recently";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "Listed recently";
  return `Listed: ${date.toLocaleDateString("en-GB")}`;
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
        <ActivityIndicator size="large" color="#C8603A" />
      </View>
    );
  }

  return (
    <View style={[styles.screen, enterStyle]}>
      <View style={styles.header}>
        <Text style={styles.title}>Mere Ads</Text>
        <Text style={styles.sub}>
          Active, sold, paused aur expired ads yahan se manage karein.
        </Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={grouped}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadMyAds("refresh")}
            tintColor="#C8603A"
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
          const thumb = item.media.find((media) => media.type === "IMAGE")?.url;
          const isBusy = busyListingId === item.id;

          return (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              onPress={() => navigation.navigate("ListingDetail", { id: item.id })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.price}>
                  {item.currency} {item.price}
                </Text>
                <Text style={styles.statusPill}>{item.status}</Text>
              </View>

              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.meta}>
                {item.city || "Pakistan"} | {formatListedDate(item.createdAt)}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                Image: {thumb || "No image"}
              </Text>

              <View style={styles.actionsRow}>
                <Pressable
                  style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                  onPress={() =>
                    navigation.navigate("Becho", { editListingId: item.id })
                  }
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
    backgroundColor: "#FDF6ED",
    paddingHorizontal: 12,
    paddingTop: 12
  },
  loading: {
    flex: 1,
    backgroundColor: "#FDF6ED",
    alignItems: "center",
    justifyContent: "center"
  },
  header: {
    marginBottom: 10
  },
  title: {
    color: "#5C3D2E",
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800"
  },
  sub: {
    color: "#9B8070",
    marginTop: 4,
    fontSize: 13
  },
  error: {
    color: "#B83A2A",
    marginBottom: 8
  },
  listContent: {
    paddingBottom: 18
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8D5B7",
    padding: 12,
    marginBottom: 10
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  price: {
    color: "#C8603A",
    fontSize: 18,
    fontWeight: "800"
  },
  statusPill: {
    color: "#5C3D2E",
    fontSize: 11,
    fontWeight: "700",
    borderWidth: 1,
    borderColor: "#E8D5B7",
    backgroundColor: "#FDF6ED",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  cardTitle: {
    marginTop: 6,
    color: "#5C3D2E",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700"
  },
  meta: {
    marginTop: 4,
    color: "#9B8070",
    fontSize: 12
  },
  actionsRow: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  actionBtn: {
    borderWidth: 1,
    borderColor: "#E8D5B7",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  actionBtnText: {
    color: "#5C3D2E",
    fontSize: 12,
    fontWeight: "700"
  },
  emptyCard: {
    marginTop: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8D5B7",
    borderRadius: 12,
    padding: 14
  },
  emptyTitle: {
    color: "#5C3D2E",
    fontSize: 15,
    fontWeight: "700"
  },
  emptySub: {
    marginTop: 4,
    color: "#9B8070",
    fontSize: 12
  },
  pressed: {
    opacity: 0.93,
    transform: [{ scale: 0.99 }]
  }
});

