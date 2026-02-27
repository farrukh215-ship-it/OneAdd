import { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { getFeedListings } from "../services/api";
import type { Listing } from "../types";

export function HomeScreen({ navigation }: any) {
  const [items, setItems] = useState<Listing[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getFeedListings().then(setItems).catch(() => setError("Failed to load feed."));
  }, []);

  return (
    <View style={styles.screen}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate("ListingDetail", { id: item.id })}
          >
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>
              {item.currency} {item.price}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 12,
    backgroundColor: "#f6f8ff"
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#12213f"
  },
  meta: {
    marginTop: 4,
    color: "#5b6880"
  },
  error: {
    color: "#c22a2a",
    marginBottom: 10
  }
});
