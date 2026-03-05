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
import {
  getAuthToken,
  getListingById,
  getListingOffers,
  upsertThread
} from "../services/api";
import {
  addRecentlyViewedListingId,
  isListingSaved,
  toggleSavedListingId
} from "../services/listing-preferences";
import type {
  Listing,
  ListingMedia,
  ListingPublicMessage
} from "../types";
import {
  displayCategoryPath,
  displayListedDate,
  displayLocation,
  displaySellerLastSeen
} from "../theme/ui-contract";
import { uiTheme } from "../theme/tokens";

const { width } = Dimensions.get("window");
const GALLERY_HEIGHT = 300;

function formatDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getUserIdFromToken(token: string) {
  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return "";
    }
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized)) as { sub?: string };
    return decoded.sub ?? "";
  } catch {
    return "";
  }
}

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
  const [contactVisible, setContactVisible] = useState(false);
  const [recentMessages, setRecentMessages] = useState<ListingPublicMessage[]>([]);
  const listingId = String(route.params?.id ?? "");
  const galleryRef = useRef<FlatList<ListingMedia> | null>(null);

  useEffect(() => {
    setLoading(true);
    setError("");
    getListingById(listingId)
      .then((data) => {
        setListing(data);
      })
      .catch(() => setError("Listing load nahi ho saki."))
      .finally(() => setLoading(false));

    getListingOffers(listingId, 12)
      .then((result) => {
        setRecentMessages(result.recentMessages ?? []);
      })
      .catch(() => {
        setRecentMessages([]);
      });
  }, [listingId]);

  useEffect(() => {
    if (!listingId) {
      return;
    }
    setContactVisible(false);
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

  function jumpToMedia(direction: "prev" | "next") {
    if (media.length <= 1) return;
    const target =
      direction === "next"
        ? (activeMediaIndex + 1) % media.length
        : (activeMediaIndex - 1 + media.length) % media.length;
    setActiveMediaIndex(target);
    galleryRef.current?.scrollToIndex({
      index: target,
      animated: true
    });
  }

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

  async function onShareFacebook() {
    const link = `https://www.teragharmeraghar.com/listing/${listingId}`;
    const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
    await Linking.openURL(fbShareUrl);
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
  const currentUserId = getUserIdFromToken(getAuthToken());
  const isOwner = Boolean(currentUserId && listing.user?.id === currentUserId);
  const canShowContact = Boolean(listing.showPhone && phone);
  const whatsappUrl = `https://wa.me/${phone.replace(/[^\d]/g, "")}`;
  const locationText = displayLocation({
    city: listing.city,
    exactLocation: listing.exactLocation,
    description: listing.description
  });
  const [cityLabel, areaLabel] = locationText.split(" / ");

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        {media.length > 0 ? (
          <View>
            <FlatList
              ref={galleryRef}
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
            {media.length > 1 ? (
              <View style={styles.galleryControls}>
                <Pressable
                  style={({ pressed }) => [styles.galleryControlBtn, pressed && styles.pressed]}
                  onPress={() => jumpToMedia("prev")}
                >
                  <Text style={styles.galleryControlText}>Prev</Text>
                </Pressable>
                <Text style={styles.galleryControlCount}>
                  {activeMediaIndex + 1}/{media.length}
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.galleryControlBtn, pressed && styles.pressed]}
                  onPress={() => jumpToMedia("next")}
                >
                  <Text style={styles.galleryControlText}>Next</Text>
                </Pressable>
              </View>
            ) : null}
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
          {displayCategoryPath(listing.mainCategoryName, listing.subCategoryName) ? (
            <Text style={styles.metaLine}>
              Category: {displayCategoryPath(listing.mainCategoryName, listing.subCategoryName)}
            </Text>
          ) : null}
          <Text style={styles.metaLine}>City: {cityLabel}</Text>
          {areaLabel ? <Text style={styles.metaLine}>Area: {areaLabel}</Text> : null}
          <Text style={styles.metaLine}>{displayListedDate(listing.createdAt)}</Text>

          <View style={styles.trustCard}>
            <Text style={styles.sellerName}>{listing.user?.fullName || "Asli Seller"}</Text>
            <Text style={styles.trustText}>{trustBadge}</Text>
            <Text style={styles.trustSub}>Trust score: {trustScore}</Text>
            <Text style={styles.trustSub}>{displaySellerLastSeen(listing.user?.lastSeenAt)}</Text>
            <Text style={styles.trustSub}>
              Note: Trust score 0 ka matlab new seller profile hai.
            </Text>
            {canShowContact ? (
              <View style={styles.contactRow}>
                <Pressable
                  style={({ pressed }) => [styles.quickActionBtn, pressed && styles.pressed]}
                  onPress={() => setContactVisible((prev) => !prev)}
                >
                  <Text style={styles.quickActionText}>
                    {contactVisible ? "Hide Contact" : "Show Contact"}
                  </Text>
                </Pressable>
                {contactVisible ? <Text style={styles.trustSub}>{phone}</Text> : null}
              </View>
            ) : (
              <Text style={styles.trustSub}>Seller ne contact hide rakha hai.</Text>
            )}
          </View>

          <View style={styles.trustCard}>
            <Text style={styles.sellerName}>Public Chat on this Product</Text>
            {recentMessages.length === 0 ? (
              <Text style={styles.trustSub}>Abhi public chat visible nahi hai.</Text>
            ) : (
              recentMessages.map((message) => (
                <Text key={message.id} style={styles.trustSub}>
                  {message.senderName}: {message.content}
                  {message.createdAt ? ` • ${formatDateTime(message.createdAt)}` : ""}
                </Text>
              ))
            )}
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
            <Pressable
              style={({ pressed }) => [styles.quickActionBtn, pressed && styles.pressed]}
              onPress={onShareFacebook}
            >
              <Text style={styles.quickActionText}>Share on Facebook</Text>
            </Pressable>
          </View>
          {error ? <Text style={styles.inlineError}>{error}</Text> : null}
        </View>
      </ScrollView>

      <View style={styles.stickyCta}>
        {isOwner ? (
          <Pressable
            style={({ pressed }) => [styles.secondaryCta, pressed && styles.pressed]}
            onPress={() =>
              navigation.navigate("Tabs", {
                screen: "Becho",
                params: { editListingId: listing.id }
              })
            }
          >
            <Text style={styles.secondaryCtaText}>Edit ADD</Text>
          </Pressable>
        ) : null}
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
        {canShowContact && !contactVisible ? (
          <Pressable
            style={({ pressed }) => [styles.secondaryCta, pressed && styles.pressed]}
            onPress={() => setContactVisible(true)}
          >
            <Text style={styles.secondaryCtaText}>Show Contact</Text>
          </Pressable>
        ) : null}
        {canShowContact && contactVisible && listing.allowSMS ? (
          <Pressable
            style={({ pressed }) => [styles.secondaryCta, pressed && styles.pressed]}
            onPress={() => Linking.openURL(whatsappUrl)}
          >
            <Text style={styles.secondaryCtaText}>WhatsApp</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: uiTheme.colors.surfaceAlt
  },
  container: {
    paddingBottom: 110
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: uiTheme.colors.surfaceAlt
  },
  loadingText: {
    marginTop: 12,
    color: "#9B8070"
  },
  errorScreen: {
    flex: 1,
    backgroundColor: uiTheme.colors.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: uiTheme.colors.textStrong
  },
  errorText: {
    marginTop: 8,
    color: uiTheme.colors.textMuted
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
    backgroundColor: uiTheme.colors.surfaceSoft
  },
  galleryFallback: {
    height: GALLERY_HEIGHT,
    marginHorizontal: 14,
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: uiTheme.colors.surfaceSoft
  },
  dotsRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6
  },
  galleryControls: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  galleryControlBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E8D5B7",
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  galleryControlText: {
    color: "#5C3D2E",
    fontSize: 12,
    fontWeight: "700"
  },
  galleryControlCount: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: "#E8D5B7"
  },
  dotActive: {
    width: 18,
    backgroundColor: uiTheme.colors.primary
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
    color: uiTheme.colors.textStrong
  },
  price: {
    marginTop: 8,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800",
    color: uiTheme.colors.primary
  },
  description: {
    marginTop: 12,
    color: uiTheme.colors.textSoft,
    lineHeight: 22,
    fontSize: 15
  },
  metaLine: {
    marginTop: 10,
    color: "#9B8070",
    fontSize: 13
  },
  trustCard: {
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: uiTheme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    padding: 12
  },
  sellerName: {
    color: uiTheme.colors.textStrong,
    fontWeight: "700",
    fontSize: 15
  },
  trustText: {
    marginTop: 4,
    color: uiTheme.colors.success,
    fontWeight: "700",
    fontSize: 13
  },
  trustSub: {
    marginTop: 4,
    color: uiTheme.colors.textSoft,
    fontSize: 12
  },
  contactRow: {
    marginTop: 8,
    gap: 6
  },
  quickActionsRow: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  quickActionBtn: {
    minWidth: 120,
    borderRadius: 12,
    backgroundColor: uiTheme.colors.surface,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    paddingVertical: 12,
    alignItems: "center"
  },
  quickActionText: {
    color: uiTheme.colors.textStrong,
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
    borderTopColor: uiTheme.colors.border
  },
  primaryCta: {
    flex: 1.2,
    height: 48,
    borderRadius: 12,
    backgroundColor: uiTheme.colors.primary,
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
    backgroundColor: uiTheme.colors.surface,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  secondaryCtaText: {
    color: uiTheme.colors.textStrong,
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

