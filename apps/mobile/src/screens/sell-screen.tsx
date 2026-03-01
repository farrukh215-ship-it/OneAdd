import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { createListing } from "../services/api";

export function SellScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoDurationSec, setVideoDurationSec] = useState("");
  const [showPhone, setShowPhone] = useState(true);
  const [allowChat, setAllowChat] = useState(true);
  const [allowCall, setAllowCall] = useState(true);
  const [allowSMS, setAllowSMS] = useState(true);

  async function onSubmit() {
    if (!categoryId.trim() || !title.trim() || !description.trim()) {
      Alert.alert("Missing fields", "Category, title aur description required hain.");
      return;
    }
    if (!price.trim() || Number(price) <= 0) {
      Alert.alert("Invalid price", "Price valid numeric honi chahiye.");
      return;
    }

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
        Alert.alert("Invalid video", "Video duration 1 se 30 sec ke darmiyan honi chahiye.");
        return;
      }
      media.push({
        type: "VIDEO",
        url: videoUrl.trim(),
        durationSec: duration
      });
    }

    try {
      await createListing({
        categoryId: categoryId.trim(),
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        showPhone,
        allowChat,
        allowCall,
        allowSMS,
        media
      });

      Alert.alert("Success", "Listing created.");
      setTitle("");
      setDescription("");
      setPrice("");
      setCategoryId("");
      setImageUrl("");
      setVideoUrl("");
      setVideoDurationSec("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not create listing.";
      Alert.alert("Error", message);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Sell Item</Text>

      <TextInput
        style={styles.input}
        placeholder="Category ID"
        value={categoryId}
        onChangeText={setCategoryId}
      />
      <TextInput
        style={styles.input}
        placeholder="Title"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Description"
        value={description}
        multiline
        onChangeText={setDescription}
      />
      <TextInput
        style={styles.input}
        placeholder="Price"
        keyboardType="numeric"
        value={price}
        onChangeText={setPrice}
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

      <ToggleRow label="Show phone" value={showPhone} onChange={setShowPhone} />
      <ToggleRow label="Allow chat" value={allowChat} onChange={setAllowChat} />
      <ToggleRow label="Allow call" value={allowCall} onChange={setAllowCall} />
      <ToggleRow label="Allow SMS" value={allowSMS} onChange={setAllowSMS} />

      <Pressable style={styles.button} onPress={onSubmit}>
        <Text style={styles.buttonText}>Publish Listing</Text>
      </Pressable>
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
    backgroundColor: "#f6f8ff"
  },
  container: {
    padding: 12
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 10,
    color: "#12213f"
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: "top"
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10
  },
  toggleLabel: {
    fontSize: 15,
    color: "#203258"
  },
  button: {
    backgroundColor: "#ff5e32",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 6
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700"
  }
});
