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
import {
  addRecentlyViewedListingId,
  isListingSaved,
  toggleSavedListingId
} from "../services/listing-preferences";
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
  const [saved, setSaved] = useState(false);
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

  useEffect(() => {
    if (!listingId) {
      return;
    }
    void addRecentlyViewedListingId(listingId);
    void isListingSaved(listingId).then(setSaved).catch(() => setSaved(false));
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
      message: `https://www.teragharmeraghar.com/listing/${listingId}`
    });
  }

  async function onToggleSaved() {
    const nextSaved = await toggleSavedListingId(listingId);
    setSaved(nextSaved);
  }

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#C8603A" />
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
    trustScore >= 80 ? "Asli Banda" : trustScore >= 50 ? "Trusted Asli Banda" : "New Member";

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
          <View style={styles.kickerPill}>
            <Text style={styles.kickerPillText}>TGMG VERIFIED LISTING</Text>
          </View>
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.price}>
            {listing.currency} {listing.price}
          </Text>
          <Text style={styles.description}>{listing.description}</Text>

          <View style={styles.trustCard}>
            <Text style={styles.sellerName}>{listing.user?.fullName || "Asli Seller"}</Text>
            <Text style={styles.trustText}>{trustBadge}</Text>
          </View>

          <View style={styles.quickActionsRow}>
            <Pressable
              style={({ pressed }) => [styles.quickActionBtn, pressed && styles.pressed]}
              onPress={onToggleSaved}
            >
              <Text style={styles.quickActionText}>{saved ? "Saved" : "Save Listing"}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.quickActionBtn, pressed && styles.pressed]}
              onPress={onShare}
            >
              <Text style={styles.quickActionText}>Share Listing</Text>
            </Pressable>
          </View>
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
    backgroundColor: "#FDF6ED"
  },
  container: {
    paddingBottom: 110
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FDF6ED"
  },
  loadingText: {
    marginTop: 12,
    color: "#9B8070"
  },
  errorScreen: {
    flex: 1,
    backgroundColor: "#FDF6ED",
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#5C3D2E"
  },
  errorText: {
    marginTop: 8,
    color: "#9B8070"
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
    backgroundColor: "#F5EAD8"
  },
  galleryFallback: {
    height: GALLERY_HEIGHT,
    marginHorizontal: 14,
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: "#F5EAD8"
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
    backgroundColor: "#E8D5B7"
  },
  dotActive: {
    width: 18,
    backgroundColor: "#C8603A"
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 16
  },
  kickerPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#F5EAD8",
    borderColor: "#E8D5B7",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 8
  },
  kickerPillText: {
    color: "#9B8070",
    fontSize: 10,
    letterSpacing: 1.3,
    fontWeight: "800"
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    color: "#5C3D2E"
  },
  price: {
    marginTop: 8,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800",
    color: "#C8603A"
  },
  description: {
    marginTop: 12,
    color: "#7A5544",
    lineHeight: 22,
    fontSize: 15
  },
  trustCard: {
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: "#F5EAD8",
    borderWidth: 1,
    borderColor: "#E8D5B7",
    padding: 12
  },
  sellerName: {
    color: "#5C3D2E",
    fontWeight: "700",
    fontSize: 15
  },
  trustText: {
    marginTop: 4,
    color: "#3D6B4F",
    fontWeight: "700",
    fontSize: 13
  },
  quickActionsRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10
  },
  quickActionBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8D5B7",
    paddingVertical: 12,
    alignItems: "center"
  },
  quickActionText: {
    color: "#5C3D2E",
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
    backgroundColor: "rgba(253,246,237,0.96)",
    borderTopWidth: 1,
    borderTopColor: "#E8D5B7"
  },
  primaryCta: {
    flex: 1.2,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#C8603A",
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8D5B7",
    alignItems: "center",
    justifyContent: "center"
  },
  secondaryCtaText: {
    color: "#5C3D2E",
    fontWeight: "700"
  },
  disabledPill: {
    flex: 1.2,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F5EAD8",
    alignItems: "center",
    justifyContent: "center"
  },
  disabledPillText: {
    color: "#9B8070",
    fontWeight: "700"
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }]
  }
});

