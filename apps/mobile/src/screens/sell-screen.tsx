import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Alert,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { AuthRequiredCard } from "../components/auth-required-card";
import { useScreenEnterAnimation } from "../hooks/use-screen-enter-animation";
import { pakistanCities } from "@aikad/shared";
import {
  activateListing,
  createListing,
  getAuthToken,
  getCategoryCatalog,
  getListingById,
  subscribeAuthToken,
  updateListing,
  uploadMediaFile
} from "../services/api";
import type { MarketplaceCategory } from "../types";

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function parseImageUrls(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractCityFromDescription(description: string) {
  const match = description.match(/\n\s*city\s*:\s*(.+)$/im);
  return match?.[1]?.trim() ?? "";
}

function cleanDescriptionMetadata(description: string) {
  return description.replace(/\n\s*city\s*:\s*.+$/gim, "").trim();
}

export function SellScreen({ navigation, route }: any) {
  const enterStyle = useScreenEnterAnimation({ distance: 16, duration: 320 });
  const [token, setToken] = useState(getAuthToken());
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("");
  const [categoryRootSlug, setCategoryRootSlug] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoDurationSec, setVideoDurationSec] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [aiHint, setAiHint] = useState("");
  const [showPhone, setShowPhone] = useState(true);
  const [allowChat, setAllowChat] = useState(true);
  const [allowCall, setAllowCall] = useState(true);
  const [allowSMS, setAllowSMS] = useState(true);
  const [isNegotiable, setIsNegotiable] = useState(false);
  const [catalog, setCatalog] = useState<MarketplaceCategory[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [editingListingId, setEditingListingId] = useState("");
  const [loadingListingForEdit, setLoadingListingForEdit] = useState(false);
  const heroAnim = useRef(new Animated.Value(0)).current;
  const detailsAnim = useRef(new Animated.Value(0)).current;
  const controlsAnim = useRef(new Animated.Value(0)).current;

  const selectedRoot = useMemo(
    () => catalog.find((item) => item.slug === categoryRootSlug) ?? catalog[0] ?? null,
    [catalog, categoryRootSlug]
  );
  const subcategories = selectedRoot?.subcategories ?? [];
  const selectedSubcategory = subcategories.find((item) => item.id === categoryId) ?? null;
  const citySuggestions = useMemo(() => {
    const query = city.trim().toLowerCase();
    if (!query) {
      return pakistanCities.slice(0, 12);
    }
    return pakistanCities
      .filter((item) => item.toLowerCase().includes(query))
      .slice(0, 12);
  }, [city]);

  useEffect(() => {
    return subscribeAuthToken((nextToken) => {
      setToken(nextToken);
    });
  }, []);

  useEffect(() => {
    if (!token) {
      setLoadingCatalog(false);
      return;
    }
    void getCategoryCatalog()
      .then((data) => {
        setCatalog(data);
        if (data.length > 0) {
          const firstRoot = data[0];
          setCategoryRootSlug(firstRoot.slug);
          if (firstRoot.subcategories.length > 0) {
            setCategoryId(firstRoot.subcategories[0].id);
          }
        }
      })
      .finally(() => setLoadingCatalog(false));
  }, [token]);

  useEffect(() => {
    if (!selectedRoot) {
      return;
    }
    const existsInRoot = selectedRoot.subcategories.some((item) => item.id === categoryId);
    if (!existsInRoot) {
      setCategoryId(selectedRoot.subcategories[0]?.id ?? "");
    }
  }, [categoryId, selectedRoot]);

  useEffect(() => {
    const editId = String(route?.params?.editListingId ?? "");

    if (!token || !editId || editId === editingListingId || loadingCatalog) {
      return;
    }

    setLoadingListingForEdit(true);
    void getListingById(editId)
      .then((listing) => {
        const root = catalog.find((entry) =>
          entry.subcategories.some((sub) => sub.id === listing.categoryId)
        );

        if (root) {
          setCategoryRootSlug(root.slug);
        }
        setCategoryId(listing.categoryId ?? "");
        setTitle(listing.title ?? "");
        setDescription(cleanDescriptionMetadata(listing.description ?? ""));
        setPrice(String(listing.price ?? ""));
        setCity(listing.city?.trim() || extractCityFromDescription(listing.description ?? ""));
        setShowPhone(Boolean(listing.showPhone));
        setAllowChat(Boolean(listing.allowChat));
        setAllowCall(Boolean(listing.allowCall));
        setAllowSMS(Boolean(listing.allowSMS));
        setIsNegotiable(Boolean(listing.isNegotiable));

        const imageUrls = listing.media
          .filter((item) => item.type === "IMAGE")
          .map((item) => item.url);
        const videoItem = listing.media.find((item) => item.type === "VIDEO");
        setImageUrl(imageUrls.join("\n"));
        setVideoUrl(videoItem?.url ?? "");
        setVideoDurationSec(videoItem?.durationSec ? String(videoItem.durationSec) : "");
        setEditingListingId(listing.id);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Listing load nahi ho saki.";
        Alert.alert("Error", message);
      })
      .finally(() => {
        setLoadingListingForEdit(false);
      });
  }, [catalog, editingListingId, loadingCatalog, route?.params?.editListingId, token]);

  useEffect(() => {
    heroAnim.setValue(0);
    detailsAnim.setValue(0);
    controlsAnim.setValue(0);

    const run = Animated.stagger(90, [
      Animated.timing(heroAnim, {
        toValue: 1,
        duration: 340,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(detailsAnim, {
        toValue: 1,
        duration: 340,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(controlsAnim, {
        toValue: 1,
        duration: 340,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]);

    run.start();
    return () => {
      run.stop();
    };
  }, [controlsAnim, detailsAnim, heroAnim, token]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setPrice("");
    setCity("");
    setImageUrl("");
    setVideoUrl("");
    setVideoDurationSec("");
    setIsNegotiable(false);
    setEditingListingId("");
    navigation.setParams?.({ editListingId: undefined });
  }

  function buildMedia() {
    const media: Array<{
      type: "IMAGE" | "VIDEO";
      url: string;
      durationSec?: number;
    }> = [];

    const imageUrls = parseImageUrls(imageUrl);
    imageUrls.forEach((url) => {
      if (!isValidHttpUrl(url)) {
        throw new Error("Image URL valid http/https honi chahiye.");
      }
      media.push({ type: "IMAGE", url });
    });
    if (videoUrl.trim()) {
      if (!isValidHttpUrl(videoUrl.trim())) {
        throw new Error("Video URL valid http/https honi chahiye.");
      }
      const duration = Number(videoDurationSec || 0);
      if (!Number.isFinite(duration) || duration <= 0 || duration > 30) {
        throw new Error("Video duration 1 se 30 sec ke darmiyan honi chahiye.");
      }
      media.push({
        type: "VIDEO",
        url: videoUrl.trim(),
        durationSec: duration
      });
    }
    const imageCount = media.filter((item) => item.type === "IMAGE").length;
    if (imageCount < 2) {
      throw new Error("Kam az kam 2 images upload karni zaroori hain.");
    }
    if (imageCount > 6) {
      throw new Error("Max 6 images allow hain.");
    }
    return media;
  }

  function runAiAssist(action: "TITLE" | "DESCRIPTION" | "PRICE" | "CATEGORY" | "SAFETY") {
    if (action === "TITLE") {
      const nextTitle = title.trim() || `${selectedSubcategory?.name ?? "Used Item"} - Asli Condition`;
      setTitle(nextTitle);
      setAiHint("AI Title Assist apply ho gaya.");
      return;
    }
    if (action === "DESCRIPTION") {
      const base = description.trim() || "Asli condition item, carefully used.";
      setDescription(
        `${base}\n\nAI Note:\n- Original photos attached\n- Demo available for serious buyer\n- No spam offers please`
      );
      setAiHint("AI Description Assist apply ho gaya.");
      return;
    }
    if (action === "PRICE") {
      const text = `${title} ${description}`.toLowerCase();
      const estimated = text.includes("iphone")
        ? 85000
        : text.includes("laptop")
          ? 95000
          : text.includes("bike")
            ? 180000
            : 12000;
      setPrice(String(estimated));
      setAiHint(`AI Price Assist: PKR ${estimated.toLocaleString()} suggested.`);
      return;
    }
    if (action === "CATEGORY") {
      const terms = `${title} ${description}`.toLowerCase();
      const suggestion = catalog
        .flatMap((root) => root.subcategories)
        .find((item) => terms.includes(item.name.toLowerCase().split(" ")[0]));
      if (suggestion) {
        setCategoryId(suggestion.id);
        setAiHint(`AI Category Assist: ${suggestion.parentName} / ${suggestion.name}`);
      } else {
        setAiHint("AI Category Assist: manual selection better hai.");
      }
      return;
    }

    const suspicious = /(advance payment|only bank|gift card|urgent deal)/i.test(
      `${title} ${description}`
    );
    setAiHint(
      suspicious
        ? "AI Safety Scan: listing wording risky lag rahi hai."
        : "AI Safety Scan: wording clean lag rahi hai."
    );
  }

  async function pickAndUploadImage() {
    setImageUploading(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error("Media permission required hai.");
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
        allowsMultipleSelection: false
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const upload = await uploadMediaFile({
        uri: asset.uri,
        name: asset.fileName ?? `image-${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? "image/jpeg",
        mediaType: "IMAGE"
      });

      setImageUrl((prev) => {
        const merged = [upload.url, ...parseImageUrls(prev)].slice(0, 6);
        return merged.join("\n");
      });
      Alert.alert("Uploaded", "Image upload ho gayi.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image upload fail ho gayi.";
      Alert.alert("Error", message);
    } finally {
      setImageUploading(false);
    }
  }

  function removeImageAt(index: number) {
    const current = parseImageUrls(imageUrl);
    const next = current.filter((_, i) => i !== index);
    setImageUrl(next.join("\n"));
  }

  function clearVideo() {
    setVideoUrl("");
    setVideoDurationSec("");
  }

  async function pickAndUploadVideo() {
    setVideoUploading(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error("Media permission required hai.");
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        quality: 0.8,
        allowsMultipleSelection: false
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const durationSec = Math.round((asset.duration ?? 0) / 1000);
      if (!durationSec || durationSec > 30) {
        throw new Error("Video duration 30 sec se kam honi chahiye.");
      }

      const upload = await uploadMediaFile({
        uri: asset.uri,
        name: asset.fileName ?? `video-${Date.now()}.mp4`,
        mimeType: asset.mimeType ?? "video/mp4",
        mediaType: "VIDEO",
        durationSec
      });

      setVideoDurationSec(String(durationSec));
      setVideoUrl(upload.url);
      Alert.alert("Uploaded", "Video upload ho gayi.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Video upload fail ho gayi.";
      Alert.alert("Error", message);
    } finally {
      setVideoUploading(false);
    }
  }

  async function onSubmit() {
    if (!categoryId.trim() || !title.trim() || !description.trim()) {
      Alert.alert("Missing fields", "Category, title aur description required hain.");
      return;
    }
    if (!price.trim() || Number(price) <= 0) {
      Alert.alert("Invalid price", "Price valid numeric honi chahiye.");
      return;
    }
    if (!city.trim()) {
      Alert.alert("Missing city", "Pakistan city select karna zaroori hai.");
      return;
    }

    setPublishing(true);
    try {
      const media = buildMedia();
      const payload = {
        categoryId: categoryId.trim(),
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        currency: "PKR",
        city: city.trim(),
        showPhone,
        allowChat,
        allowCall,
        allowSMS,
        isNegotiable,
        media
      };

      if (editingListingId) {
        const updated = await updateListing(editingListingId, payload);
        setEditingListingId("");
        navigation.setParams?.({ editListingId: undefined });
        Alert.alert("Success", "ADD update ho gayi.");
        navigation.navigate("ListingDetail", { id: updated.id });
      } else {
        const created = await createListing(payload);
        await activateListing(created.id);
        resetForm();
        Alert.alert("Success", "Listing post ho gayi.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create listing.";
      Alert.alert("Error", message);
    } finally {
      setPublishing(false);
    }
  }

  if (!token) {
    return (
      <AuthRequiredCard
        navigation={navigation}
        title="Bechne ke liye pehle account banao"
        subtitle="Apna saaman post karne ke liye login ya create account karein."
      />
    );
  }

  return (
    <AnimatedScrollView
      style={[styles.screen, enterStyle]}
      contentContainerStyle={styles.container}
    >
      <Animated.View
        style={[
          styles.heroCard,
          {
            opacity: heroAnim,
            transform: [
              {
                translateY: heroAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0]
                })
              }
            ]
          }
        ]}
      >
        <Text style={styles.kicker}>TGMG SELL STUDIO</Text>
        <Text style={styles.heading}>
          {editingListingId ? "Apna ADD Update Karo" : "Apna Saaman Becho"}
        </Text>
        <Text style={styles.sub}>Ek ADD - seedha asli kharedaar tak</Text>
        <Text style={styles.note}>
          Shopkeepers/showroom owners ke duplicate ADDs marketplace ko flood karte hain.
          TGMG par real sellers ko priority milti hai.
        </Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.panel,
          {
            opacity: detailsAnim,
            transform: [
              {
                translateY: detailsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [14, 0]
                })
              }
            ]
          }
        ]}
      >
        <Text style={styles.panelTitle}>
          {editingListingId ? "Update Listing Details" : "Listing Details"}
        </Text>
        {loadingListingForEdit ? (
          <Text style={styles.subcategoryHint}>Loading listing...</Text>
        ) : null}

        <Text style={styles.fieldLabel}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rootChips}>
          {catalog.map((root) => (
            <Pressable
              key={root.id}
              style={({ pressed }) => [
                styles.rootChip,
                categoryRootSlug === root.slug ? styles.rootChipActive : null,
                pressed ? styles.pressed : null
              ]}
              onPress={() => setCategoryRootSlug(root.slug)}
            >
              <Text style={styles.rootChipText}>
                {root.icon} {root.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.fieldLabel}>Subcategory</Text>
        <View style={styles.subcategoryWrap}>
          {loadingCatalog ? (
            <Text style={styles.subcategoryHint}>Loading categories...</Text>
          ) : (
            subcategories.map((sub) => (
              <Pressable
                key={sub.id}
                style={({ pressed }) => [
                  styles.subcategoryChip,
                  categoryId === sub.id ? styles.subcategoryChipActive : null,
                  pressed ? styles.pressed : null
                ]}
                onPress={() => setCategoryId(sub.id)}
              >
                <Text style={styles.subcategoryText}>{sub.name}</Text>
              </Pressable>
            ))
          )}
        </View>

        <TextInput
          style={styles.input}
          placeholder="Kya bech rahe ho? (Title)"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Apni cheez ke baare mein batao"
          value={description}
          multiline
          onChangeText={setDescription}
        />
        <Text style={styles.aiHintText}>Asli condition, faults aur accessories clearly likhein.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.aiActionRow}>
          <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} onPress={() => runAiAssist("TITLE")}>
            <Text style={styles.secondaryButtonText}>AI Title</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} onPress={() => runAiAssist("DESCRIPTION")}>
            <Text style={styles.secondaryButtonText}>AI Description</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} onPress={() => runAiAssist("PRICE")}>
            <Text style={styles.secondaryButtonText}>AI Price</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} onPress={() => runAiAssist("CATEGORY")}>
            <Text style={styles.secondaryButtonText}>AI Category</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} onPress={() => runAiAssist("SAFETY")}>
            <Text style={styles.secondaryButtonText}>AI Safety</Text>
          </Pressable>
        </ScrollView>
        {aiHint ? <Text style={styles.aiHintText}>{aiHint}</Text> : null}
        <TextInput
          style={styles.input}
          placeholder="Daam (PKR)"
          keyboardType="numeric"
          value={price}
          onChangeText={setPrice}
        />
        <TextInput
          style={styles.input}
          placeholder="Aap kahan hain? (Pakistan City)"
          value={city}
          onChangeText={setCity}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.citySuggestionRow}>
          {citySuggestions.map((cityName) => (
            <Pressable
              key={cityName}
              style={({ pressed }) => [
                styles.citySuggestionChip,
                city.trim().toLowerCase() === cityName.toLowerCase() ? styles.citySuggestionChipActive : null,
                pressed ? styles.pressed : null
              ]}
              onPress={() => setCity(cityName)}
            >
              <Text style={styles.citySuggestionText}>{cityName}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            (imageUploading || publishing) ? styles.buttonDisabled : null,
            pressed ? styles.pressed : null
          ]}
          onPress={() => {
            void pickAndUploadImage();
          }}
          disabled={imageUploading || publishing}
        >
          <Text style={styles.secondaryButtonText}>
            {imageUploading ? "Uploading image..." : "Image Upload (Gallery)"}
          </Text>
        </Pressable>
        {parseImageUrls(imageUrl).map((url, index) => (
          <View style={styles.uploadedMediaRow} key={`${url}-${index}`}>
            <Text style={styles.uploadedMediaText} numberOfLines={1}>
              Image {index + 1}: {url}
            </Text>
            <Pressable
              style={({ pressed }) => [styles.removeMediaBtn, pressed ? styles.pressed : null]}
              onPress={() => removeImageAt(index)}
            >
              <Text style={styles.removeMediaBtnText}>Remove</Text>
            </Pressable>
          </View>
        ))}
        <Text style={styles.aiHintText}>
          Uploaded images: {parseImageUrls(imageUrl).length} (minimum 2, max 6)
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            (videoUploading || publishing) ? styles.buttonDisabled : null,
            pressed ? styles.pressed : null
          ]}
          onPress={() => {
            void pickAndUploadVideo();
          }}
          disabled={videoUploading || publishing}
        >
          <Text style={styles.secondaryButtonText}>
            {videoUploading ? "Uploading video..." : "Video Upload (Gallery, <=30s)"}
          </Text>
        </Pressable>
        {videoUrl ? (
          <View style={styles.uploadedMediaRow}>
            <Text style={styles.uploadedMediaText} numberOfLines={1}>
              Video ({videoDurationSec || "0"} sec): {videoUrl}
            </Text>
            <Pressable
              style={({ pressed }) => [styles.removeMediaBtn, pressed ? styles.pressed : null]}
              onPress={clearVideo}
            >
              <Text style={styles.removeMediaBtnText}>Remove</Text>
            </Pressable>
          </View>
        ) : null}

        {selectedSubcategory ? (
          <Text style={styles.selectedInfo}>
            Selected: {selectedRoot?.name} / {selectedSubcategory.name}
          </Text>
        ) : null}
      </Animated.View>

      <Animated.View
        style={[
          styles.panel,
          {
            opacity: controlsAnim,
            transform: [
              {
                translateY: controlsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [14, 0]
                })
              }
            ]
          }
        ]}
      >
        <Text style={styles.panelTitle}>Contact Controls</Text>
        <ToggleRow label="Phone show karo" value={showPhone} onChange={setShowPhone} />
        <ToggleRow label="Chat allow karo" value={allowChat} onChange={setAllowChat} />
        <ToggleRow label="Call allow karo" value={allowCall} onChange={setAllowCall} />
        <ToggleRow label="WhatsApp allow karo" value={allowSMS} onChange={setAllowSMS} />
        <ToggleRow label="Price negotiable" value={isNegotiable} onChange={setIsNegotiable} />
      </Animated.View>

      <Animated.View
        style={{
          opacity: controlsAnim,
          transform: [
            {
              translateY: controlsAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0]
              })
            }
          ]
        }}
      >
        <Pressable
          style={[styles.button, publishing ? styles.buttonDisabled : null]}
          onPress={onSubmit}
          disabled={publishing}
        >
          <Text style={styles.buttonText}>
            {publishing ? "Please wait..." : editingListingId ? "Update ADD" : "Post Karo"}
          </Text>
        </Pressable>
      </Animated.View>
    </AnimatedScrollView>
  );
}

function ToggleRow({
  label,
  value,
  onChange
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FDF6ED"
  },
  container: {
    padding: 12,
    paddingBottom: 22
  },
  heroCard: {
    backgroundColor: "#5C3D2E",
    borderColor: "#3D2518",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10
  },
  kicker: {
    color: "#F5EAD8",
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "800",
    marginBottom: 4
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
    color: "#FDF6ED"
  },
  sub: {
    color: "#E8D5B7",
    marginBottom: 6
  },
  note: {
    color: "#F5EAD8",
    fontSize: 12
  },
  panel: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E8D5B7",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10
  },
  panelTitle: {
    color: "#5C3D2E",
    fontWeight: "800",
    marginBottom: 10
  },
  fieldLabel: {
    color: "#7A5544",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6
  },
  rootChips: {
    gap: 8,
    paddingBottom: 8
  },
  rootChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E8D5B7",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  rootChipActive: {
    borderColor: "#C8603A",
    backgroundColor: "#FFF7F3"
  },
  rootChipText: {
    color: "#5C3D2E",
    fontSize: 12,
    fontWeight: "700"
  },
  subcategoryWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10
  },
  subcategoryChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E8D5B7",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  subcategoryChipActive: {
    borderColor: "#C8603A",
    backgroundColor: "#FFF7F3"
  },
  subcategoryText: {
    color: "#5C3D2E",
    fontSize: 12,
    fontWeight: "700"
  },
  subcategoryHint: {
    color: "#9B8070",
    fontSize: 12
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E8D5B7"
  },
  citySuggestionRow: {
    gap: 8,
    paddingBottom: 10
  },
  citySuggestionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E8D5B7",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  citySuggestionChipActive: {
    borderColor: "#C8603A",
    backgroundColor: "#FFF4EE"
  },
  citySuggestionText: {
    color: "#5C3D2E",
    fontSize: 12,
    fontWeight: "700"
  },
  aiActionRow: {
    gap: 8,
    paddingBottom: 10
  },
  aiHintText: {
    marginBottom: 10,
    color: "#7A5544",
    fontSize: 12
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: "top"
  },
  selectedInfo: {
    marginTop: 2,
    color: "#7A5544",
    fontSize: 12
  },
  uploadedMediaRow: {
    borderWidth: 1,
    borderColor: "#E8D5B7",
    borderRadius: 10,
    backgroundColor: "#FFFDF9",
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  uploadedMediaText: {
    flex: 1,
    color: "#7A5544",
    fontSize: 12
  },
  removeMediaBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E8D5B7",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  removeMediaBtnText: {
    color: "#7A5544",
    fontSize: 11,
    fontWeight: "700"
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E8D5B7"
  },
  toggleLabel: {
    fontSize: 15,
    color: "#5C3D2E"
  },
  button: {
    backgroundColor: "#C8603A",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 2
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700"
  },
  buttonDisabled: {
    opacity: 0.6
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(30,20,16,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#E8D5B7"
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#5C3D2E"
  },
  modalSubtitle: {
    color: "#9B8070",
    fontSize: 13,
    lineHeight: 19
  },
  modalActions: {
    gap: 8
  },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    alignItems: "center",
    backgroundColor: "#FDF6ED",
    borderWidth: 1,
    borderColor: "#E8D5B7"
  },
  secondaryButtonText: {
    color: "#7A5544",
    fontWeight: "700",
    fontSize: 13
  },
  closeLinkText: {
    color: "#7A5544",
    fontWeight: "700",
    textAlign: "center"
  },
  pressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }]
  }
});
