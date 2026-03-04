import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
  ViewToken
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { getVideoFeed, VideoFeedItem } from "../services/api";
import { isListingSaved, toggleSavedListingId } from "../services/listing-preferences";
import { useScreenEnterAnimation } from "../hooks/use-screen-enter-animation";

const { height } = Dimensions.get("window");

type ReelCardProps = {
  item: VideoFeedItem;
  isActive: boolean;
  navigation: any;
};

function ReelCard({ item, isActive, navigation }: ReelCardProps) {
  const player = useVideoPlayer(item.videoUrl, (p) => {
    p.loop = true;
    p.muted = true;
  });

  const [muted, setMuted] = useState(true);
  const [pausedByUser, setPausedByUser] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saved, setSaved] = useState(false);

  const ctaOpacity = useRef(new Animated.Value(isActive ? 1 : 0.72)).current;
  const ctaLift = useRef(new Animated.Value(isActive ? 0 : 14)).current;
  const primaryPulse = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    void isListingSaved(item.listingId)
      .then(setSaved)
      .catch(() => setSaved(false));
  }, [item.listingId]);

  useEffect(() => {
    player.muted = muted;
    if (isActive && !pausedByUser) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, muted, pausedByUser, player]);

  useEffect(() => {
    if (!isActive) {
      setProgress(0);
      return;
    }

    const timer = setInterval(() => {
      const duration = Number(player.duration ?? 0);
      const currentTime = Number(player.currentTime ?? 0);
      if (!duration || !Number.isFinite(duration)) {
        setProgress(0);
        return;
      }
      setProgress(Math.max(0, Math.min(1, currentTime / duration)));
    }, 250);

    return () => clearInterval(timer);
  }, [isActive, player]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(ctaOpacity, {
        toValue: isActive ? 1 : 0.72,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(ctaLift, {
        toValue: isActive ? 0 : 14,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();

    pulseLoopRef.current?.stop();
    primaryPulse.setValue(1);
    if (isActive) {
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(primaryPulse, {
            toValue: 1.04,
            duration: 820,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true
          }),
          Animated.timing(primaryPulse, {
            toValue: 1,
            duration: 820,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true
          })
        ])
      );
      pulseLoopRef.current.start();
    }

    return () => {
      pulseLoopRef.current?.stop();
    };
  }, [ctaLift, ctaOpacity, isActive, primaryPulse]);

  async function onShare() {
    await Share.share({
      message: `https://www.teragharmeraghar.com/listing/${item.listingId}`
    });
  }

  async function onToggleSaved() {
    const next = await toggleSavedListingId(item.listingId);
    setSaved(next);
  }

  return (
    <View style={styles.reelPage}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => setPausedByUser((prev) => !prev)}>
        <VideoView player={player} style={styles.video} contentFit="cover" />
      </Pressable>

      <View style={styles.progressTrack}>
        <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
      </View>

      <View style={styles.topOverlay}>
        <View style={styles.topBadge}>
          <Text style={styles.topBadgeText}>TGMG REELS</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.uploadBadge, pressed && styles.pressed]}
          onPress={() => navigation.navigate("Tabs", { screen: "Becho" })}
        >
          <Text style={styles.uploadBadgeText}>Upload Reel</Text>
        </Pressable>
      </View>

      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: ctaOpacity,
            transform: [{ translateY: ctaLift }]
          }
        ]}
      >
        <Text style={styles.price}>
          {item.currency} {item.price}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.actions}>
          <Animated.View style={{ flex: 1.25, transform: [{ scale: primaryPulse }] }}>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              onPress={() => navigation.navigate("ListingDetail", { id: item.listingId })}
            >
              <Text style={styles.primaryBtnText}>Product Dekho</Text>
            </Pressable>
          </Animated.View>
          <Pressable style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]} onPress={onShare}>
            <Text style={styles.ghostBtnText}>Share</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
            onPress={() => {
              void onToggleSaved();
            }}
          >
            <Text style={styles.ghostBtnText}>{saved ? "Saved" : "Save"}</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]} onPress={() => setMuted((prev) => !prev)}>
            <Text style={styles.ghostBtnText}>{muted ? "Unmute" : "Mute"}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
            onPress={() => setPausedByUser((prev) => !prev)}
          >
            <Text style={styles.ghostBtnText}>{pausedByUser ? "Play" : "Pause"}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

function LoadingReel() {
  return (
    <View style={styles.reelPage}>
      <View style={styles.shimmerBlock} />
    </View>
  );
}

export function ReelsScreen({ navigation }: any) {
  const enterStyle = useScreenEnterAnimation({ distance: 16, duration: 300 });
  const [items, setItems] = useState<VideoFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    getVideoFeed()
      .then((data) => {
        setItems(data);
        setError("");
      })
      .catch(() => setError("Reels load nahi ho saki."))
      .finally(() => setLoading(false));
  }, []);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.index !== null && viewableItems[0]?.index !== undefined) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  if (loading) {
    return (
      <Animated.View style={[styles.container, enterStyle]}>
        <FlatList
          data={[1, 2]}
          keyExtractor={(item) => String(item)}
          pagingEnabled
          renderItem={() => <LoadingReel />}
        />
        <View style={styles.loadingBadge}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.loadingText}>Loading reels...</Text>
        </View>
      </Animated.View>
    );
  }

  if (items.length === 0) {
    return (
      <Animated.View style={[styles.container, enterStyle]}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No videos yet</Text>
          {error ? <Text style={styles.emptySub}>{error}</Text> : null}
          <Pressable style={({ pressed }) => [styles.uploadBadge, pressed && styles.pressed]} onPress={() => navigation.navigate("Tabs", { screen: "Becho" })}>
            <Text style={styles.uploadBadgeText}>Upload First Reel</Text>
          </Pressable>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, enterStyle]}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.listingId}
        pagingEnabled
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
        renderItem={({ item, index }) => (
          <ReelCard item={item} isActive={index === activeIndex} navigation={navigation} />
        )}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E1410"
  },
  reelPage: {
    height,
    width: "100%"
  },
  video: {
    width: "100%",
    height: "100%"
  },
  progressTrack: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 8,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.28)",
    overflow: "hidden"
  },
  progressBar: {
    width: "0%",
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#E07A52"
  },
  overlay: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 20,
    gap: 10
  },
  topOverlay: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  topBadge: {
    backgroundColor: "rgba(30,20,16,0.55)",
    borderColor: "rgba(232,213,183,0.45)",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  topBadgeText: {
    color: "#FDF6ED",
    fontSize: 11,
    letterSpacing: 1.3,
    fontWeight: "800"
  },
  uploadBadge: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: "#E8D5B7",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  uploadBadgeText: {
    color: "#5C3D2E",
    fontSize: 11,
    fontWeight: "800"
  },
  price: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 2 }
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 2 }
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  primaryBtn: {
    flex: 1.25,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E8D5B7",
    minWidth: 130
  },
  primaryBtnText: {
    color: "#C8603A",
    fontWeight: "800"
  },
  ghostBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(232,213,183,0.6)",
    backgroundColor: "rgba(0,0,0,0.24)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 12
  },
  ghostBtnText: {
    color: "#fff",
    fontWeight: "700"
  },
  shimmerBlock: {
    width: "100%",
    height: "100%",
    backgroundColor: "#151b19"
  },
  loadingBadge: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 24,
    alignItems: "center",
    gap: 8
  },
  loadingText: {
    color: "#FDF6ED"
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700"
  },
  emptySub: {
    marginTop: 8,
    color: "#D4B896",
    textAlign: "center"
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }]
  }
});
