import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Linking,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
  ViewToken
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { getFeedListings } from "../services/api";
import type { Listing } from "../types";

const { height } = Dimensions.get("window");

type ReelItem = {
  listing: Listing;
  videoUrl: string;
};

export function ReelsScreen({ navigation }: any) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    getFeedListings()
      .then(setListings)
      .catch(() => setError("Failed to load reels."));
  }, []);

  const reels = useMemo<ReelItem[]>(
    () =>
      listings.reduce<ReelItem[]>((acc, listing) => {
        const video = listing.media.find(
          (item) => item.type === "VIDEO" && (item.durationSec ?? 0) <= 30
        );
        if (video?.url) {
          acc.push({
            listing,
            videoUrl: video.url
          });
        }
        return acc;
      }, []),
    [listings]
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.index !== null && viewableItems[0]?.index !== undefined) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  async function shareToFacebook(listingId: string) {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      `https://aikad.app/listing/${listingId}`
    )}`;
    await Linking.openURL(url);
  }

  async function shareToTikTok(listingId: string) {
    const deeplink = `tiktok://share?url=${encodeURIComponent(
      `https://aikad.app/listing/${listingId}`
    )}`;

    const canOpen = await Linking.canOpenURL(deeplink);
    if (canOpen) {
      await Linking.openURL(deeplink);
      return;
    }

    await Share.share({
      message: `Check this out on Aikad: https://aikad.app/listing/${listingId}`
    });
  }

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={reels}
        keyExtractor={(item) => item.listing.id}
        pagingEnabled
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
        renderItem={({ item, index }) => (
          <View style={styles.reelPage}>
            <Video
              source={{ uri: item.videoUrl }}
              style={styles.video}
              resizeMode={ResizeMode.COVER}
              isLooping
              shouldPlay={index === activeIndex}
              isMuted={false}
            />
            <View style={styles.overlay}>
              <Text style={styles.title}>{item.listing.title}</Text>
              <Text style={styles.meta}>
                {item.listing.currency} {item.listing.price}
              </Text>
              <View style={styles.actions}>
                <Pressable
                  style={styles.button}
                  onPress={() => navigation.navigate("ListingDetail", { id: item.listing.id })}
                >
                  <Text style={styles.buttonText}>Open Product</Text>
                </Pressable>
                <Pressable
                  style={styles.buttonSecondary}
                  onPress={() => shareToTikTok(item.listing.id)}
                >
                  <Text style={styles.buttonText}>Share TikTok</Text>
                </Pressable>
                <Pressable
                  style={styles.buttonSecondary}
                  onPress={() => shareToFacebook(item.listing.id)}
                >
                  <Text style={styles.buttonText}>Share Facebook</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000"
  },
  reelPage: {
    height,
    width: "100%"
  },
  video: {
    width: "100%",
    height: "100%"
  },
  overlay: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 20
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4
  },
  meta: {
    color: "#f7d5c8",
    marginBottom: 10
  },
  actions: {
    gap: 8
  },
  button: {
    backgroundColor: "#ff5e32",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center"
  },
  buttonSecondary: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center"
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700"
  },
  error: {
    color: "#fff",
    position: "absolute",
    top: 60,
    left: 12,
    zIndex: 2
  }
});
