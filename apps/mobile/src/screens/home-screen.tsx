import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from "react-native";
import { getListings } from "../services/api";
import type { Listing } from "../types";

function formatRelativeTime(input?: string) {
  if (!input) {
    return "Just now";
  }
  const createdAt = new Date(input);
  if (Number.isNaN(createdAt.getTime())) {
    return "Just now";
  }

  const diffSeconds = Math.floor((Date.now() - createdAt.getTime()) / 1000);
  if (diffSeconds < 60) {
    return "Just now";
  }
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function getTrustBadge(score: number) {
  if (score >= 80) {
    return "Highly Trusted";
  }
  if (score >= 50) {
    return "Trusted Seller";
  }
  return "New Seller";
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
};

function HomeCard({ item, onPress }: HomeCardProps) {
  const image = useMemo(
    () => item.media.find((media) => media.type === "IMAGE")?.url,
    [item.media]
  );
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
        <Text style={styles.price}>
          {item.currency} {item.price}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{item.city || "Pakistan"}</Text>
          <Text style={styles.metaDot}>•</Text>
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
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadFeed(mode: "initial" | "refresh" = "initial") {
    if (mode === "initial") {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError("");

    try {
      const data = await getListings();
      setItems(data);
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
    loadFeed("initial");
  }, []);

  return (
    <View style={styles.screen}>
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
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadFeed("refresh")}
              tintColor="#0f8e66"
            />
          }
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={styles.brandRow}>
                <Image source={require("../../assets/zaroratbazar-logo.jpg")} style={styles.brandLogo} />
                <View>
                  <Text style={styles.kicker}>ZaroratBazar</Text>
                  <Text style={styles.brandSub}>صرف اصل لوگ، اصل چیزیں</Text>
                </View>
              </View>
              <Text style={styles.headerTitle}>Latest Listings</Text>
            </View>
          }
          ListEmptyComponent={error ? <Text style={styles.error}>{error}</Text> : <EmptyState />}
          renderItem={({ item }) => (
            <HomeCard
              item={item}
              onPress={() => navigation.navigate("ListingDetail", { id: item.id })}
            />
          )}
        />
      )}
      {!loading && refreshing ? (
        <View style={styles.refreshOverlay}>
          <ActivityIndicator size="small" color="#0f8e66" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f6f8f6"
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 22,
    paddingTop: 10
  },
  header: {
    marginBottom: 12
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  brandLogo: {
    width: 34,
    height: 34,
    borderRadius: 10
  },
  kicker: {
    color: "#0f8e66",
    fontSize: 12,
    letterSpacing: 0.3,
    fontWeight: "800"
  },
  brandSub: {
    color: "#648279",
    fontSize: 11,
    marginTop: 1
  },
  headerTitle: {
    marginTop: 4,
    fontSize: 30,
    lineHeight: 34,
    color: "#1f2422",
    fontWeight: "800"
  },
  card: {
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    marginBottom: 16,
    shadowColor: "#222",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
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
    backgroundColor: "#e8eeea"
  },
  cardBody: {
    padding: 14
  },
  price: {
    fontSize: 24,
    lineHeight: 28,
    color: "#101513",
    fontWeight: "800"
  },
  title: {
    marginTop: 6,
    fontSize: 16,
    lineHeight: 22,
    color: "#26312c",
    fontWeight: "700"
  },
  metaRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center"
  },
  metaText: {
    color: "#617069",
    fontSize: 13
  },
  metaDot: {
    marginHorizontal: 8,
    color: "#8c9792"
  },
  trustPill: {
    marginTop: 10,
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#e6f4ee",
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  trustText: {
    color: "#0f704f",
    fontSize: 12,
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
    backgroundColor: "#e7ece8"
  },
  skeletonBody: {
    padding: 14
  },
  skeletonLine: {
    height: 13,
    borderRadius: 999,
    backgroundColor: "#e7ece8",
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
    backgroundColor: "#e8eeea"
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    color: "#1f2422",
    fontWeight: "700"
  },
  emptySub: {
    marginTop: 6,
    color: "#6a7670"
  },
  refreshOverlay: {
    position: "absolute",
    top: 12,
    left: 0,
    right: 0,
    alignItems: "center"
  }
});
