import { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { searchListings } from "../services/api";
import type { Listing } from "../types";

export function SearchScreen({ navigation }: any) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Listing[]>([]);

  useEffect(() => {
    if (!query.trim()) {
      setItems([]);
      return;
    }

    const handle = setTimeout(() => {
      searchListings(query.trim()).then(setItems).catch(() => setItems([]));
    }, 250);

    return () => clearTimeout(handle);
  }, [query]);

  return (
    <View style={styles.screen}>
      <TextInput
        style={styles.input}
        placeholder="Search listings"
        value={query}
        onChangeText={setQuery}
      />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate("ListingDetail", { id: item.id })}
          >
            <Text style={styles.title}>{item.title}</Text>
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
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10
  },
  title: {
    fontSize: 15,
    fontWeight: "600"
  }
});
