import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import * as Location from 'expo-location';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ProgressHeader } from '../../components/ProgressHeader';
import { api } from '../../lib/api';
import { uploadPostMediaToR2 } from '../../lib/uploads';

const cities = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad'];

const cityCoords: Record<string, { lat: number; lng: number }> = {
  Lahore: { lat: 31.5204, lng: 74.3587 },
  Karachi: { lat: 24.8607, lng: 67.0011 },
  Islamabad: { lat: 33.6844, lng: 73.0479 },
  Rawalpindi: { lat: 33.5651, lng: 73.0169 },
  Faisalabad: { lat: 31.4504, lng: 73.135 },
};

export default function PostLocationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string>>();
  const isDukaanMode = params.mode === 'dukaan' || params.mode === 'store';
  const [city, setCity] = useState(cities.includes(params.city || '') ? params.city! : cities[0]);
  const [area, setArea] = useState('');
  const [storeType, setStoreType] = useState<'ONLINE' | 'ROAD'>('ROAD');
  const [lat, setLat] = useState<number | undefined>(cityCoords[params.city || cities[0]]?.lat);
  const [lng, setLng] = useState<number | undefined>(cityCoords[params.city || cities[0]]?.lng);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);

  const images = useMemo(() => {
    const parsed = params.images ? JSON.parse(params.images) : [];
    if (!Array.isArray(parsed)) return [];
    const coverImage = params.coverImage;
    if (!coverImage) return parsed.slice(0, 6);
    const ordered = [coverImage, ...parsed.filter((item: string) => item !== coverImage)];
    return ordered.slice(0, 6);
  }, [params.coverImage, params.images]);

  const videos = useMemo(() => {
    const parsed = params.videos ? JSON.parse(params.videos) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 1);
  }, [params.videos]);

  const createListing = useMutation({
    mutationFn: async () => {
      if (!images.length) {
        throw new Error('Kam az kam 1 image upload karein');
      }

      const coords = cityCoords[city];
      const { imageUrls, videoUrls } = await uploadPostMediaToR2({ images, videos });
      if (!imageUrls.length) {
        throw new Error('Image upload fail hui');
      }

      const payload = {
        title: params.title,
        description: params.description,
        price: Number(params.price),
        categoryId: params.categoryId,
        images: imageUrls,
        videos: videoUrls,
        condition: params.condition,
        isStore: isDukaanMode,
        storeType: isDukaanMode ? storeType : undefined,
        city,
        area: area.trim() || undefined,
        lat: lat ?? coords?.lat,
        lng: lng ?? coords?.lng,
      };
      const response = await api.post('/listings', payload);
      return response.data;
    },
    onSuccess: (data) => {
      Alert.alert('Mubarak', 'Aapki listing publish ho gayi.');
      router.replace(`/listing/${data.id ?? data.data?.id}`);
    },
    onError: (error: any) => {
      const serverMessage = error?.response?.data?.message;
      const text = Array.isArray(serverMessage) ? serverMessage[0] : serverMessage;
      Alert.alert('Masla', text || error?.message || 'Ad publish nahi hui, dobara try karein.');
    },
  });

  const useCurrentLocation = async () => {
    setIsResolvingLocation(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission', 'Location permission allow karein');
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const nextLat = current.coords.latitude;
      const nextLng = current.coords.longitude;
      setLat(nextLat);
      setLng(nextLng);

      const reverse = await Location.reverseGeocodeAsync({ latitude: nextLat, longitude: nextLng });
      const top = reverse[0];
      if (top) {
        const nextCity = top.city || top.subregion || top.region;
        if (nextCity && cities.includes(nextCity)) {
          setCity(nextCity);
        }
        const nextArea = top.district || top.street || top.name;
        if (nextArea) setArea(nextArea);
      }
    } catch {
      Alert.alert('Masla', 'Current location read nahi hui, dobara try karein');
    } finally {
      setIsResolvingLocation(false);
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <ProgressHeader step={4} title="Location Set Karein" />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View className="mb-3 self-start rounded-full bg-red/10 px-3 py-1.5">
          <Text className="text-xs font-bold text-red">Selected: {params.categoryName || 'Category'}</Text>
        </View>

        <Text className="mb-2 text-sm font-semibold text-ink">City</Text>
        <View className="flex-row flex-wrap gap-2">
          {cities.map((item) => (
            <Pressable
              key={item}
              onPress={() => {
                setCity(item);
                setLat(cityCoords[item]?.lat);
                setLng(cityCoords[item]?.lng);
              }}
              className={`rounded-full px-4 py-3 ${city === item ? 'bg-red' : 'border border-border bg-white'}`}
            >
              <Text className={`font-semibold ${city === item ? 'text-white' : 'text-ink2'}`}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={useCurrentLocation}
          className="mt-3 rounded-xl border border-border bg-white px-4 py-3"
          disabled={isResolvingLocation}
        >
          <Text className="text-center font-semibold text-ink">
            {isResolvingLocation ? 'Location aa rahi hai...' : 'Current Location Use Karo'}
          </Text>
        </Pressable>

        <Text className="mb-2 mt-4 text-sm font-semibold text-ink">Area</Text>
        <TextInput
          value={area}
          onChangeText={setArea}
          className="rounded-xl border border-border bg-white px-4 py-3 text-ink"
          placeholder="Area optional hai"
        />

        {isDukaanMode ? (
          <>
            <Text className="mb-2 mt-4 text-sm font-semibold text-ink">Dukaan Type</Text>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setStoreType('ROAD')}
                className={`rounded-full px-4 py-3 ${
                  storeType === 'ROAD' ? 'bg-red' : 'border border-border bg-white'
                }`}
              >
                <Text className={`font-semibold ${storeType === 'ROAD' ? 'text-white' : 'text-ink2'}`}>
                  Road Dukaan
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setStoreType('ONLINE')}
                className={`rounded-full px-4 py-3 ${
                  storeType === 'ONLINE' ? 'bg-red' : 'border border-border bg-white'
                }`}
              >
                <Text className={`font-semibold ${storeType === 'ONLINE' ? 'text-white' : 'text-ink2'}`}>
                  Online Dukaan
                </Text>
              </Pressable>
            </View>
          </>
        ) : null}

        <View className="mt-5 rounded-xl bg-[#FFF8E1] p-4">
          <Text className="text-sm font-semibold text-[#8A6D1D]">
            Rule: Ek category mein maximum 3 active ads allowed.
          </Text>
        </View>

        <Pressable
          disabled={createListing.isPending}
          onPress={() => createListing.mutate()}
          className="mt-6 rounded-xl bg-red py-4"
        >
          <Text className="text-center text-base font-bold text-white">
            {createListing.isPending ? 'Ad lag rahi hai...' : 'Ad Lagao'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
