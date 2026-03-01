import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  ViewToken
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEffect } from "react";
import { getListingById, upsertThread } from "../services/api";
import type { Listing, ListingMedia } from "../types";

const { width } = Dimensions.get("window");
const GALLERY_HEIGHT = 300;

type GalleryItemProps = {
  media: ListingMedia;
  title: string;
  isActive: boolean;
};

function GalleryItem({ media, title, isActive }: GalleryItemProps) {
  const player = useVideoPlayer(media.url, (p) => {
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    if (media.type !== "VIDEO") {
      return;
    }
    if (isActive) {
      player.play();
      return;
    }
    player.pause();
  }, [isActive, media.type, player]);

  if (media.type === "IMAGE") {
    return <Image source={{ uri: media.url }} style={styles.galleryMedia} resizeMode="cover" />;
  }

  return <VideoView player={player} style={styles.galleryMedia} contentFit="cover" />;
}

export function ListingDetailScreen({ route, navigation }: any) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [chatLoading, setChatLoading] = useState(false);
  const listingId = String(route.params?.id ?? "");

  useEffect(() => {
    setLoading(true);
    setError("");
    getListingById(listingId)
      .then((data) => {
        setListing(data);
      })
      .catch(() => setError("Listing load nahi ho saki."))
      .finally(() => setLoading(false));
  }, [listingId]);

  const media = useMemo(() => {
    if (!listing) {
      return [];
    }
    const images = listing.media.filter((item) => item.type === "IMAGE").slice(0, 6);
    const video = listing.media.find(
      (item) => item.type === "VIDEO" && (item.durationSec ?? 0) <= 30
    );
    return video ? [...images, video] : images;
  }, [listing]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.index !== null && viewableItems[0]?.index !== undefined) {
        setActiveMediaIndex(viewableItems[0].index);
      }
    }
  ).current;

  async function openChat() {
    if (!listing) {
      return;
    }
    setChatLoading(true);
    setError("");
    try {
      await upsertThread(listing.id);
      navigation.navigate("Tabs", { screen: "Chat" });
    } catch {
      setError("Chat open nahi ho saki.");
    } finally {
      setChatLoading(false);
    }
  }

  async function onShare() {
    await Share.share({
      message: `https://zaroratbazar.shop/listing/${listingId}`
    });
  }

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#0f8e66" />
        <Text style={styles.loadingText}>Loading listing...</Text>
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.errorScreen}>
        <Text style={styles.errorTitle}>Listing not available</Text>
        <Text style={styles.errorText}>{error || "Please try again."}</Text>
      </View>
    );
  }

  const phone = listing.user?.phone ?? "";
  const trustScore = listing.user?.trustScore?.score ?? 0;
  const trustBadge =
    trustScore >= 80 ? "Highly Trusted" : trustScore >= 50 ? "Trusted Seller" : "New Seller";

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        {media.length > 0 ? (
          <View>
            <FlatList
              data={media}
              horizontal
              pagingEnabled
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={{ itemVisiblePercentThreshold: 70 }}
              renderItem={({ item, index }) => (
                <View style={styles.gallerySlide}>
                  <GalleryItem media={item} title={listing.title} isActive={index === activeMediaIndex} />
                </View>
              )}
            />
            <View style={styles.dotsRow}>
              {media.map((item, index) => (
                <View
                  key={`${item.id}-${index}`}
                  style={[styles.dot, index === activeMediaIndex ? styles.dotActive : null]}
                />
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.galleryFallback} />
        )}

        <View style={styles.body}>
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.price}>
            {listing.currency} {listing.price}
          </Text>
          <Text style={styles.description}>{listing.description}</Text>

          <View style={styles.trustCard}>
            <Text style={styles.sellerName}>{listing.user?.fullName || "Verified Seller"}</Text>
            <Text style={styles.trustText}>{trustBadge}</Text>
          </View>

          <Pressable style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]} onPress={onShare}>
            <Text style={styles.shareText}>Share Listing</Text>
          </Pressable>
          {error ? <Text style={styles.inlineError}>{error}</Text> : null}
        </View>
      </ScrollView>

      <View style={styles.stickyCta}>
        {listing.allowChat ? (
          <Pressable
            style={({ pressed }) => [styles.primaryCta, pressed && styles.pressed]}
            onPress={openChat}
            disabled={chatLoading}
          >
            <Text style={styles.primaryCtaText}>{chatLoading ? "Opening..." : "Chat"}</Text>
          </Pressable>
        ) : (
          <View style={styles.disabledPill}>
            <Text style={styles.disabledPillText}>Chat disabled</Text>
          </View>
        )}
        {listing.allowCall && phone ? (
          <Pressable
            style={({ pressed }) => [styles.secondaryCta, pressed && styles.pressed]}
            onPress={() => Linking.openURL(`tel:${phone}`)}
          >
            <Text style={styles.secondaryCtaText}>Call</Text>
          </Pressable>
        ) : null}
        {listing.allowSMS && phone ? (
          <Pressable
            style={({ pressed }) => [styles.secondaryCta, pressed && styles.pressed]}
            onPress={() => Linking.openURL(`sms:${phone}`)}
          >
            <Text style={styles.secondaryCtaText}>SMS</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f6f8f6"
  },
  container: {
    paddingBottom: 110
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f6f8f6"
  },
  loadingText: {
    marginTop: 12,
    color: "#42524b"
  },
  errorScreen: {
    flex: 1,
    backgroundColor: "#f6f8f6",
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2422"
  },
  errorText: {
    marginTop: 8,
    color: "#6b7772"
  },
  gallerySlide: {
    width,
    height: GALLERY_HEIGHT,
    paddingHorizontal: 14,
    paddingTop: 12
  },
  galleryMedia: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
    backgroundColor: "#dde6e0"
  },
  galleryFallback: {
    height: GALLERY_HEIGHT,
    marginHorizontal: 14,
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: "#dde6e0"
  },
  dotsRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: "#cad5cf"
  },
  dotActive: {
    width: 18,
    backgroundColor: "#0f8e66"
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 16
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    color: "#16211c"
  },
  price: {
    marginTop: 8,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800",
    color: "#0d7f5b"
  },
  description: {
    marginTop: 12,
    color: "#42524b",
    lineHeight: 22,
    fontSize: 15
  },
  trustCard: {
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: "#eaf6f0",
    borderWidth: 1,
    borderColor: "#d0e8dc",
    padding: 12
  },
  sellerName: {
    color: "#1e2b25",
    fontWeight: "700",
    fontSize: 15
  },
  trustText: {
    marginTop: 4,
    color: "#0f704f",
    fontWeight: "700",
    fontSize: 13
  },
  shareBtn: {
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: "#e7eeea",
    paddingVertical: 12,
    alignItems: "center"
  },
  shareText: {
    color: "#2d3934",
    fontWeight: "700"
  },
  inlineError: {
    marginTop: 10,
    color: "#b32045"
  },
  stickyCta: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderTopWidth: 1,
    borderTopColor: "#dce6df"
  },
  primaryCta: {
    flex: 1.2,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#0f8e66",
    alignItems: "center",
    justifyContent: "center"
  },
  primaryCtaText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15
  },
  secondaryCta: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#e8f2ed",
    alignItems: "center",
    justifyContent: "center"
  },
  secondaryCtaText: {
    color: "#21463a",
    fontWeight: "700"
  },
  disabledPill: {
    flex: 1.2,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#edf1ef",
    alignItems: "center",
    justifyContent: "center"
  },
  disabledPillText: {
    color: "#64736c",
    fontWeight: "700"
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }]
  }
});
