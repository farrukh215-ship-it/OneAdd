import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
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

const { height } = Dimensions.get("window");

type ReelCardProps = {
  item: VideoFeedItem;
  isActive: boolean;
  navigation: any;
};

function ReelCard({ item, isActive, navigation }: ReelCardProps) {
  const player = useVideoPlayer(item.videoUrl, (p) => {
    p.loop = true;
    p.muted = false;
  });

  useEffect(() => {
    if (isActive) {
      player.play();
      return;
    }
    player.pause();
  }, [isActive, player]);

  async function onShare() {
    await Share.share({
      message: `https://zaroratbazar.shop/listing/${item.listingId}`
    });
  }

  return (
    <View style={styles.reelPage}>
      <VideoView player={player} style={styles.video} contentFit="cover" />

      <View style={styles.overlay}>
        <Text style={styles.price}>
          {item.currency} {item.price}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            onPress={() => navigation.navigate("ListingDetail", { id: item.listingId })}
          >
            <Text style={styles.primaryBtnText}>View Product</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]} onPress={onShare}>
            <Text style={styles.ghostBtnText}>Share</Text>
          </Pressable>
        </View>
      </View>
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
      <View style={styles.container}>
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
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No videos yet</Text>
          {error ? <Text style={styles.emptySub}>{error}</Text> : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
    left: 12,
    right: 12,
    bottom: 20,
    gap: 10
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
    gap: 8
  },
  primaryBtn: {
    flex: 1.25,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12
  },
  primaryBtnText: {
    color: "#101614",
    fontWeight: "800"
  },
  ghostBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    backgroundColor: "rgba(0,0,0,0.24)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12
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
    color: "#f3f6f5"
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700"
  },
  emptySub: {
    marginTop: 8,
    color: "#b6c0bc",
    textAlign: "center"
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }]
  }
});
