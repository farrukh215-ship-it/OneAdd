import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from "react-native";
import {
  getSavedListingIds,
  resolveListingsByIds,
  toggleSavedListingId
} from "../services/listing-preferences";
import type { Listing } from "../types";

export function SavedScreen({ navigation }: any) {
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadSaved(mode: "initial" | "refresh" = "initial") {
    if (mode === "initial") {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError("");
    try {
      const savedIds = await getSavedListingIds();
      const resolved = await resolveListingsByIds(savedIds);
      setItems(resolved);
    } catch {
      setError("Saved adds load nahi hui. Dobara try karein.");
    } finally {
      if (mode === "initial") {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }

  useEffect(() => {
    void loadSaved("initial");
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      void loadSaved("refresh");
    });
    return unsubscribe;
  }, [navigation]);

  async function onUnsave(listingId: string) {
    await toggleSavedListingId(listingId);
    await loadSaved("refresh");
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#C8603A" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Saved Adds</Text>
        <Text style={styles.sub}>Aap ki save ki hui listings yahan milengi.</Text>
        <Pressable
          style={({ pressed }) => [styles.recentBtn, pressed && styles.pressed]}
          onPress={() => navigation.getParent()?.navigate("RecentlyViewed")}
        >
          <Text style={styles.recentBtnText}>Open Recently Viewed</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void loadSaved("refresh")} tintColor="#C8603A" />
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Abhi koi saved add nahi</Text>
            <Text style={styles.emptySub}>Home ya Dhundo se Save button use karein.</Text>
          </View>
        }
        ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            onPress={() => navigation.navigate("ListingDetail", { id: item.id })}
          >
            <View style={styles.priceRow}>
              <Text style={styles.price}>
                {item.currency} {item.price}
              </Text>
              <Pressable
                style={({ pressed }) => [styles.unsaveBtn, pressed && styles.pressed]}
                onPress={(event) => {
                  event.stopPropagation?.();
                  void onUnsave(item.id);
                }}
              >
                <Text style={styles.unsaveBtnText}>Unsave</Text>
              </Pressable>
            </View>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.meta}>{item.city || "Pakistan"}</Text>
          </Pressable>
        )}
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
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FDF6ED"
  },
  header: {
    marginBottom: 12
  },
  title: {
    color: "#5C3D2E",
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800"
  },
  sub: {
    color: "#9B8070",
    fontSize: 13,
    marginTop: 4
  },
  recentBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderColor: "#E8D5B7",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  recentBtnText: {
    color: "#5C3D2E",
    fontSize: 12,
    fontWeight: "700"
  },
  listContent: {
    paddingBottom: 18
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E8D5B7",
    shadowColor: "#5C3D2E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8
  },
  price: {
    color: "#C8603A",
    fontSize: 18,
    fontWeight: "800"
  },
  unsaveBtn: {
    borderWidth: 1,
    borderColor: "#E8D5B7",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  unsaveBtnText: {
    color: "#5C3D2E",
    fontSize: 11,
    fontWeight: "700"
  },
  cardTitle: {
    marginTop: 6,
    color: "#5C3D2E",
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600"
  },
  meta: {
    marginTop: 4,
    color: "#9B8070",
    fontSize: 12
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E8D5B7",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 8
  },
  emptyTitle: {
    color: "#5C3D2E",
    fontSize: 15,
    fontWeight: "700"
  },
  emptySub: {
    color: "#9B8070",
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18
  },
  error: {
    color: "#b42040",
    marginBottom: 8
  },
  pressed: {
    opacity: 0.93,
    transform: [{ scale: 0.99 }]
  }
});
