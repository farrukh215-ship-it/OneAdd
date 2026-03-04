import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { PhoneAuthProvider, signInWithCredential } from "firebase/auth";
import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import { AuthRequiredCard } from "../components/auth-required-card";
import { firebaseAppForRecaptcha, firebaseAuth } from "../services/firebase";
import {
  activateListing,
  createListing,
  getAuthToken,
  getCategoryCatalog,
  requestListingPublishOtp,
  subscribeAuthToken,
  verifyListingPublishOtp
} from "../services/api";
import type { MarketplaceCategory } from "../types";

export function SellScreen({ navigation }: any) {
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
  const [showPhone, setShowPhone] = useState(true);
  const [allowChat, setAllowChat] = useState(true);
  const [allowCall, setAllowCall] = useState(true);
  const [allowSMS, setAllowSMS] = useState(true);
  const [isNegotiable, setIsNegotiable] = useState(false);
  const [catalog, setCatalog] = useState<MarketplaceCategory[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [publishPhone, setPublishPhone] = useState("");
  const [publishOtpCode, setPublishOtpCode] = useState("");
  const [verificationId, setVerificationId] = useState("");

  const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal>(null);

  const selectedRoot = useMemo(
    () => catalog.find((item) => item.slug === categoryRootSlug) ?? catalog[0] ?? null,
    [catalog, categoryRootSlug]
  );
  const subcategories = selectedRoot?.subcategories ?? [];
  const selectedSubcategory = subcategories.find((item) => item.id === categoryId) ?? null;

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

  function resetForm() {
    setTitle("");
    setDescription("");
    setPrice("");
    setCity("");
    setImageUrl("");
    setVideoUrl("");
    setVideoDurationSec("");
    setIsNegotiable(false);
  }

  function buildMedia() {
    const media: Array<{
      type: "IMAGE" | "VIDEO";
      url: string;
      durationSec?: number;
    }> = [];

    if (imageUrl.trim()) {
      media.push({ type: "IMAGE", url: imageUrl.trim() });
    }
    if (videoUrl.trim()) {
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
    return media;
  }

  async function requestPublishOtp() {
    const response = await requestListingPublishOtp();
    const provider = new PhoneAuthProvider(firebaseAuth);
    const id = await provider.verifyPhoneNumber(
      response.phone,
      recaptchaVerifier.current as any
    );
    setPublishPhone(response.phone);
    setVerificationId(id);
    setPublishOtpCode("");
    setOtpModalVisible(true);
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

    setPublishing(true);
    try {
      buildMedia();
      await requestPublishOtp();
      Alert.alert("OTP Sent", `OTP ${publishPhone || "registered phone"} par bhej diya gaya.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not request publish OTP.";
      Alert.alert("Error", message);
    } finally {
      setPublishing(false);
    }
  }

  async function onVerifyAndPublish() {
    if (!verificationId) {
      Alert.alert("Error", "Pehle OTP request karein.");
      return;
    }
    if (publishOtpCode.trim().length !== 6) {
      Alert.alert("Error", "6-digit OTP required.");
      return;
    }

    setPublishing(true);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, publishOtpCode.trim());
      const userCredential = await signInWithCredential(firebaseAuth, credential);
      const idToken = await userCredential.user.getIdToken(true);
      const otpVerification = await verifyListingPublishOtp({ idToken });
      const media = buildMedia();

      const created = await createListing({
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
        publishOtpVerificationToken: otpVerification.publishOtpVerificationToken,
        media
      });

      await activateListing(created.id);
      setOtpModalVisible(false);
      resetForm();
      Alert.alert("Success", "Listing post ho gayi.");
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
        subtitle="Apna saaman post karne aur OTP publish verification ke liye login ya create account karein."
      />
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={firebaseAppForRecaptcha.options}
        attemptInvisibleVerification
      />

      <View style={styles.heroCard}>
        <Text style={styles.kicker}>TGMG SELL STUDIO</Text>
        <Text style={styles.heading}>Apna Saaman Becho</Text>
        <Text style={styles.sub}>Ek ADD - seedha asli kharedaar tak</Text>
        <Text style={styles.note}>
          Shopkeepers/showroom owners ke duplicate ADDs marketplace ko flood karte hain.
          TGMG par real sellers ko priority milti hai.
        </Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Listing Details</Text>

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
          placeholder="Kya bech rahe ho?"
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
        <TextInput
          style={styles.input}
          placeholder="Daam (PKR)"
          keyboardType="numeric"
          value={price}
          onChangeText={setPrice}
        />
        <TextInput
          style={styles.input}
          placeholder="Aap kahan hain?"
          value={city}
          onChangeText={setCity}
        />
        <TextInput
          style={styles.input}
          placeholder="Image URL"
          value={imageUrl}
          onChangeText={setImageUrl}
        />
        <TextInput
          style={styles.input}
          placeholder="Video URL (optional)"
          value={videoUrl}
          onChangeText={setVideoUrl}
        />
        <TextInput
          style={styles.input}
          placeholder="Video duration <=30 sec"
          keyboardType="numeric"
          value={videoDurationSec}
          onChangeText={setVideoDurationSec}
        />

        {selectedSubcategory ? (
          <Text style={styles.selectedInfo}>
            Selected: {selectedRoot?.name} / {selectedSubcategory.name}
          </Text>
        ) : null}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Contact Controls</Text>
        <ToggleRow label="Phone show karo" value={showPhone} onChange={setShowPhone} />
        <ToggleRow label="Chat allow karo" value={allowChat} onChange={setAllowChat} />
        <ToggleRow label="Call allow karo" value={allowCall} onChange={setAllowCall} />
        <ToggleRow label="SMS allow karo" value={allowSMS} onChange={setAllowSMS} />
        <ToggleRow label="Price negotiable" value={isNegotiable} onChange={setIsNegotiable} />
      </View>

      <Pressable
        style={[styles.button, publishing ? styles.buttonDisabled : null]}
        onPress={onSubmit}
        disabled={publishing}
      >
        <Text style={styles.buttonText}>
          {publishing ? "Please wait..." : "Post Karo (OTP Verify)"}
        </Text>
      </Pressable>

      <Modal transparent visible={otpModalVisible} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Publish OTP Verification</Text>
            <Text style={styles.modalSubtitle}>
              Listing post karne ke liye OTP verify karein. OTP: {publishPhone}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="6-digit OTP"
              value={publishOtpCode}
              onChangeText={setPublishOtpCode}
              keyboardType="number-pad"
              maxLength={6}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.secondaryButton, publishing ? styles.buttonDisabled : null]}
                onPress={() => {
                  void requestPublishOtp();
                }}
                disabled={publishing}
              >
                <Text style={styles.secondaryButtonText}>Resend OTP</Text>
              </Pressable>
              <Pressable
                style={[styles.button, publishing ? styles.buttonDisabled : null]}
                onPress={() => {
                  void onVerifyAndPublish();
                }}
                disabled={publishing}
              >
                <Text style={styles.buttonText}>Verify & Post</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => setOtpModalVisible(false)}>
              <Text style={styles.closeLinkText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
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
  multiline: {
    minHeight: 90,
    textAlignVertical: "top"
  },
  selectedInfo: {
    marginTop: 2,
    color: "#7A5544",
    fontSize: 12
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
