import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { getCategoryCatalog, searchListingsWithFilters } from "../services/api";
import type { Listing, MarketplaceCategory } from "../types";

export function SearchScreen({ navigation, route }: any) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState("");

  const selectedRoot = useMemo(() => {
    const asRoot = categories.find((item) => item.slug === selectedCategorySlug);
    if (asRoot) {
      return asRoot;
    }
    return categories.find((item) => item.subcategories.some((sub) => sub.slug === selectedCategorySlug));
  }, [categories, selectedCategorySlug]);

  useEffect(() => {
    void getCategoryCatalog().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const presetQuery = route?.params?.presetQuery;
    const presetCategory = route?.params?.presetCategory;

    if (typeof presetQuery === "string") {
      setQuery(presetQuery);
    }
    if (typeof presetCategory === "string") {
      setSelectedCategorySlug(presetCategory);
    }
  }, [route?.params?.presetCategory, route?.params?.presetQuery]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    const normalizedCategory = selectedCategorySlug.trim();

    if (!normalizedQuery && !normalizedCategory) {
      setItems([]);
      return;
    }

    const handle = setTimeout(() => {
      void searchListingsWithFilters({
        query: normalizedQuery,
        category: normalizedCategory
      })
        .then(setItems)
        .catch(() => setItems([]));
    }, 250);

    return () => clearTimeout(handle);
  }, [query, selectedCategorySlug]);

  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Dhundo</Text>
        <Text style={styles.heroSub}>Real people ki verified listings, seedha aur fast search.</Text>
      </View>

      <View style={styles.searchRow}>
        <Text style={styles.searchIcon}>{"\ud83d\udd0d"}</Text>
        <TextInput
          style={styles.input}
          placeholder="Dhundo listings..."
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {categories.map((category) => {
          const selected =
            selectedCategorySlug === category.slug ||
            category.subcategories.some((sub) => sub.slug === selectedCategorySlug);
          return (
            <Pressable
              key={category.id}
              style={({ pressed }) => [styles.chip, selected && styles.chipActive, pressed && styles.pressed]}
              onPress={() => setSelectedCategorySlug((prev) => (prev === category.slug ? "" : category.slug))}
            >
              <Text style={styles.chipText}>
                {category.icon} {category.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {selectedRoot ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subchipsRow}>
          {selectedRoot.subcategories.map((sub) => {
            const selected = selectedCategorySlug === sub.slug;
            return (
              <Pressable
                key={sub.id}
                style={({ pressed }) => [
                  styles.subchip,
                  selected && styles.subchipActive,
                  pressed && styles.pressed
                ]}
                onPress={() => setSelectedCategorySlug(selected ? selectedRoot.slug : sub.slug)}
              >
                <Text style={styles.subchipText}>{sub.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          query.trim().length > 0 || selectedCategorySlug ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Koi listing nahi mili</Text>
              <Text style={styles.emptySub}>Dusra keyword try karein, ya category change karein.</Text>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Search start karein</Text>
              <Text style={styles.emptySub}>Category select karein ya apna keyword likhein.</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            onPress={() => navigation.navigate("ListingDetail", { id: item.id })}
          >
            <Text style={styles.price}>
              {item.currency} {item.price}
            </Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>{item.city || "Pakistan"}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    backgroundColor: "#FDF6ED"
  },
  hero: {
    marginBottom: 10
  },
  heroTitle: {
    color: "#5C3D2E",
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800"
  },
  heroSub: {
    color: "#9B8070",
    fontSize: 13,
    marginTop: 4
  },
  searchRow: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E8D5B7",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 6
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    color: "#5C3D2E"
  },
  chipsRow: {
    gap: 8,
    paddingBottom: 8
  },
  chip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E8D5B7",
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  chipActive: {
    borderColor: "#C8603A",
    backgroundColor: "#FFF7F3"
  },
  chipText: {
    color: "#7A5544",
    fontSize: 12,
    fontWeight: "700"
  },
  subchipsRow: {
    gap: 8,
    paddingBottom: 10
  },
  subchip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E8D5B7",
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  subchipActive: {
    borderColor: "#C8603A",
    backgroundColor: "#FFF7F3"
  },
  subchipText: {
    color: "#5C3D2E",
    fontSize: 12,
    fontWeight: "700"
  },
  listContent: {
    paddingBottom: 18
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E8D5B7",
    shadowColor: "#5C3D2E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2
  },
  price: {
    color: "#C8603A",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 2
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#5C3D2E"
  },
  meta: {
    marginTop: 4,
    color: "#9B8070",
    fontSize: 12
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E8D5B7",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 8
  },
  emptyTitle: {
    color: "#5C3D2E",
    fontSize: 15,
    fontWeight: "700"
  },
  emptySub: {
    color: "#9B8070",
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18
  },
  pressed: {
    opacity: 0.93,
    transform: [{ scale: 0.99 }]
  }
});
