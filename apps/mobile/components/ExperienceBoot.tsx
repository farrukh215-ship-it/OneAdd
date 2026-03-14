import * as Location from 'expo-location';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, SafeAreaView, Text, View } from 'react-native';
import { completeOnboarding, getLocationPreference, isOnboardingComplete, setLocationPreference } from '../lib/mobile-preferences';

const steps = [
  {
    title: 'Asli Malik, Koi Dealer Nahi',
    body: 'Har listing ko direct owner-first experience ke saath dekhne ke liye app tayar hai.',
  },
  {
    title: 'Photo Lo, Ad Lagao, Becho',
    body: '3 simple steps: details daalo, photos upload karo, location set karo aur publish karo.',
  },
  {
    title: 'Apne shehar ki listings dekhein',
    body: 'Location allow karoge to nearby aur city-specific listings pehle milengi.',
  },
] as const;

const stepIcons = ['shield', 'sell', 'location'] as const;

function StepIcon({ icon }: { icon: (typeof stepIcons)[number] }) {
  if (icon === 'location') {
    return (
      <View className="h-16 w-16 items-center justify-center rounded-full border border-red/15 bg-red/10">
        <View className="h-7 w-7 items-center justify-center rounded-full border-2 border-red">
          <View className="h-2.5 w-2.5 rounded-full bg-red" />
        </View>
      </View>
    );
  }

  if (icon === 'sell') {
    return (
      <View className="h-16 w-16 items-center justify-center rounded-full border border-red/15 bg-red/10">
        <View className="h-8 w-8 rotate-[-12deg] rounded-[10px] border-2 border-red bg-white">
          <View className="absolute left-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red" />
        </View>
      </View>
    );
  }

  return (
    <View className="h-16 w-16 items-center justify-center rounded-full border border-red/15 bg-red/10">
      <View className="h-8 w-8 items-center justify-center rounded-[12px] border-2 border-red bg-white">
        <View className="h-4 w-5 rounded-b-[10px] rounded-t-[2px] border-2 border-red bg-red/10" />
      </View>
    </View>
  );
}

export function ExperienceBoot() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const current = useMemo(() => steps[step], [step]);

  useEffect(() => {
    if (!isOnboardingComplete()) {
      setVisible(true);
    }
  }, []);

  const finish = () => {
    completeOnboarding();
    setVisible(false);
  };

  const handleAllowLocation = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status === 'granted') {
        const currentPosition = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const reverse = await Location.reverseGeocodeAsync({
          latitude: currentPosition.coords.latitude,
          longitude: currentPosition.coords.longitude,
        });
        const top = reverse[0];
        setLocationPreference({
          ...getLocationPreference(),
          granted: true,
          city: top?.city ?? top?.subregion ?? top?.region ?? undefined,
          area: top?.district ?? top?.street ?? top?.name ?? undefined,
          lat: currentPosition.coords.latitude,
          lng: currentPosition.coords.longitude,
        });
      } else {
        setLocationPreference({ ...getLocationPreference(), granted: false });
      }
    } catch {
      setLocationPreference({ ...getLocationPreference(), granted: false });
    } finally {
      finish();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <SafeAreaView className="flex-1 bg-[#111827]/80 px-6 py-8">
        <View className="flex-1 justify-center">
          <View className="rounded-[28px] bg-white px-6 py-8">
            <View className="mb-6 self-center">
              <StepIcon icon={stepIcons[step]} />
            </View>

            <Text className="text-center text-[24px] font-extrabold text-ink">{current.title}</Text>
            <Text className="mt-3 text-center text-sm leading-6 text-ink2">{current.body}</Text>

            <View className="mt-6 flex-row items-center justify-center gap-2">
              {steps.map((_, index) => (
                <View
                  key={index}
                  className={`h-2.5 rounded-full ${index === step ? 'w-8 bg-red' : 'w-2.5 bg-border'}`}
                />
              ))}
            </View>

            {step < 2 ? (
              <View className="mt-8 gap-3">
                <Pressable
                  onPress={() => setStep((currentStep) => currentStep + 1)}
                  className="rounded-xl bg-red py-4"
                >
                  <Text className="text-center text-base font-bold text-white">Next</Text>
                </Pressable>
                <Pressable onPress={finish} className="rounded-xl bg-[#F5F6F7] py-4">
                  <Text className="text-center text-sm font-semibold text-ink2">Skip</Text>
                </Pressable>
              </View>
            ) : (
              <View className="mt-8 gap-3">
                <Pressable onPress={handleAllowLocation} className="rounded-xl bg-red py-4">
                  <Text className="text-center text-base font-bold text-white">Lahore Allow Karo</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setLocationPreference({ ...getLocationPreference(), granted: false });
                    finish();
                  }}
                  className="rounded-xl bg-[#F5F6F7] py-4"
                >
                  <Text className="text-center text-sm font-semibold text-ink2">Baad Mein</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
