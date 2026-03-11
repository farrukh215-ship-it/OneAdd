import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { ProgressHeader } from '../../components/ProgressHeader';

export default function PostPhotosScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string>>();
  const [images, setImages] = useState<string[]>([]);

  const pickImage = async () => {
    if (images.length >= 8) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setImages((current) => [...current, result.assets[0]!.uri]);
    }
  };

  const removeImage = (uri: string) => {
    setImages((current) => current.filter((item) => item !== uri));
  };

  return (
    <View className="flex-1 bg-bg">
      <ProgressHeader step={3} title="Photos Upload Karein" />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View className="flex-row flex-wrap gap-3">
          {images.map((uri) => (
            <View key={uri} className="relative h-[104px] w-[104px] overflow-hidden rounded-xl bg-border">
              <Image source={{ uri }} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
              <Pressable
                onPress={() => removeImage(uri)}
                className="absolute right-2 top-2 h-7 w-7 items-center justify-center rounded-full bg-white/90"
              >
                <Text className="font-bold text-ink">×</Text>
              </Pressable>
            </View>
          ))}

          {images.length < 8 ? (
            <Pressable
              onPress={pickImage}
              className="h-[104px] w-[104px] items-center justify-center rounded-xl border border-dashed border-border bg-white"
            >
              <Text className="text-3xl text-red">+</Text>
              <Text className="mt-1 text-xs font-semibold text-ink2">Photo Add</Text>
            </Pressable>
          ) : null}
        </View>

        <Text className="mt-4 text-xs text-ink3">Kam az kam 1 aur zyada se zyada 8 photos.</Text>

        <Pressable
          disabled={images.length < 1}
          onPress={() =>
            router.push({
              pathname: '/post/location',
              params: {
                ...params,
                images: JSON.stringify(images),
              },
            })
          }
          className={`mt-6 rounded-xl py-4 ${images.length >= 1 ? 'bg-red' : 'bg-border'}`}
        >
          <Text className="text-center text-base font-bold text-white">Aage Barhein →</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
