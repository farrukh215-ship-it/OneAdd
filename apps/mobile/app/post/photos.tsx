import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { ProgressHeader } from '../../components/ProgressHeader';

export default function PostPhotosScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string>>();
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState<string>('');
  const [message, setMessage] = useState<string | null>(null);

  const pickImage = async () => {
    if (images.length >= 6) {
      setMessage('Maximum 6 images allow hain');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      const uri = result.assets[0].uri;
      setImages((current) => [...current, uri]);
      if (!coverImage) {
        setCoverImage(uri);
      }
      setMessage(null);
    }
  };

  const pickVideo = async () => {
    if (videos.length >= 1) {
      setMessage('Sirf 1 video allow hai');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.7,
      videoMaxDuration: 30,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      const duration = result.assets[0].duration ?? 0;
      if (duration > 30_000) {
        setMessage('Video 30 sec se zyada nahi honi chahiye');
        return;
      }
      setVideos([result.assets[0].uri]);
      setMessage(null);
    }
  };

  const removeImage = (uri: string) => {
    const nextImages = images.filter((item) => item !== uri);
    setImages(nextImages);
    if (coverImage === uri) {
      setCoverImage(nextImages[0] ?? '');
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <ProgressHeader step={3} title="Photos & Video" />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View className="mb-3 self-start rounded-full bg-red/10 px-3 py-1.5">
          <Text className="text-xs font-bold text-red">
            Selected: {params.categoryName || 'Category'}
          </Text>
        </View>
        {params.subcategoryName ? (
          <View className="mb-3 self-start rounded-full bg-[#FFF4E5] px-3 py-1.5">
            <Text className="text-xs font-bold text-[#A55B00]">
              Sub-category: {params.subcategoryName}
            </Text>
          </View>
        ) : null}

        <View className="flex-row flex-wrap gap-3">
          {images.map((uri) => (
            <View
              key={uri}
              className={`relative h-[104px] w-[104px] overflow-hidden rounded-xl bg-border ${
                coverImage === uri ? 'border border-red' : ''
              }`}
            >
              <Image source={{ uri }} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
              <Pressable
                onPress={() => removeImage(uri)}
                className="absolute right-2 top-2 h-7 w-7 items-center justify-center rounded-full bg-white/90"
              >
                <Text className="font-bold text-ink">X</Text>
              </Pressable>
              <Pressable
                onPress={() => setCoverImage(uri)}
                className="absolute bottom-1 left-1 rounded bg-white/90 px-1.5 py-0.5"
              >
                <Text className="text-[9px] font-bold text-red">
                  {coverImage === uri ? 'Cover OK' : 'Cover'}
                </Text>
              </Pressable>
            </View>
          ))}

          {images.length < 6 ? (
            <Pressable
              onPress={pickImage}
              className="h-[104px] w-[104px] items-center justify-center rounded-xl border border-dashed border-border bg-white"
            >
              <Text className="text-3xl text-red">+</Text>
              <Text className="mt-1 text-xs font-semibold text-ink2">Photo</Text>
            </Pressable>
          ) : null}

          {videos.length < 1 ? (
            <Pressable
              onPress={pickVideo}
              className="h-[104px] w-[104px] items-center justify-center rounded-xl border border-dashed border-border bg-white"
            >
              <Text className="text-3xl text-red">V</Text>
              <Text className="mt-1 text-xs font-semibold text-ink2">Video</Text>
            </Pressable>
          ) : (
            <View className="h-[104px] w-[104px] items-center justify-center rounded-xl bg-white">
              <Text className="text-sm font-semibold text-ink2">1 video added</Text>
            </View>
          )}
        </View>

        <Text className="mt-4 text-xs text-ink3">
          Kam az kam 1 image, max 6 images + 1 video (30 sec).
        </Text>
        {message ? <Text className="mt-2 text-xs font-semibold text-red">{message}</Text> : null}

        <Pressable
          disabled={images.length < 1 || !coverImage}
          onPress={() =>
            router.push({
              pathname: '/post/location',
              params: {
                ...params,
                images: JSON.stringify(images),
                videos: JSON.stringify(videos),
                coverImage,
              },
            })
          }
          className={`mt-6 rounded-xl py-4 ${
            images.length >= 1 && coverImage ? 'bg-red' : 'bg-border'
          }`}
        >
          <Text className="text-center text-base font-bold text-white">Aage Barhein</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
