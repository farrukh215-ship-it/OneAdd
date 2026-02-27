import { useEffect, useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View
} from "react-native";
import { getListingById, upsertThread } from "../services/api";
import type { Listing } from "../types";

export function ListingDetailScreen({ route, navigation }: any) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState("");
  const listingId = String(route.params?.id ?? "");

  useEffect(() => {
    getListingById(listingId)
      .then(setListing)
      .catch(() => setError("Failed to load listing."));
  }, [listingId]);

  async function openChat() {
    try {
      await upsertThread(listingId);
      navigation.navigate("Tabs", { screen: "Chat" });
    } catch {
      setError("Unable to open chat.");
    }
  }

  async function onShare() {
    await Share.share({
      message: `https://aikad.app/listing/${listingId}`
    });
  }

  if (!listing) {
    return (
      <View style={styles.screen}>
        <Text>{error || "Loading..."}</Text>
      </View>
    );
  }

  const phone = listing.user?.phone ?? "";

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.title}>{listing.title}</Text>
      <Text style={styles.price}>
        {listing.currency} {listing.price}
      </Text>
      <Text style={styles.description}>{listing.description}</Text>

      <View style={styles.actionRow}>
        {listing.showPhone && phone ? <Text style={styles.pill}>{phone}</Text> : null}
        {listing.allowCall && phone ? (
          <Pressable style={styles.button} onPress={() => Linking.openURL(`tel:${phone}`)}>
            <Text style={styles.buttonText}>Call</Text>
          </Pressable>
        ) : null}
        {listing.allowSMS && phone ? (
          <Pressable style={styles.buttonSecondary} onPress={() => Linking.openURL(`sms:${phone}`)}>
            <Text style={styles.buttonText}>SMS</Text>
          </Pressable>
        ) : null}
        {listing.allowChat ? (
          <Pressable style={styles.buttonSecondary} onPress={openChat}>
            <Text style={styles.buttonText}>Chat</Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable style={styles.buttonSecondary} onPress={onShare}>
        <Text style={styles.buttonText}>Share</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f6f8ff"
  },
  container: {
    padding: 14
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#13244a"
  },
  price: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "700",
    color: "#ff5e32"
  },
  description: {
    marginTop: 10,
    color: "#405070"
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
    marginBottom: 8
  },
  button: {
    backgroundColor: "#ff5e32",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  buttonSecondary: {
    backgroundColor: "#dce7ff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  buttonText: {
    color: "#13244a",
    fontWeight: "700"
  },
  pill: {
    backgroundColor: "#e9edf7",
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#26375f"
  },
  error: {
    marginTop: 8,
    color: "#c22a2a"
  }
});
