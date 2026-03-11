import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, SafeAreaView, Text, TextInput, View } from 'react-native';
import { api } from '../../lib/api';

export default function PhoneAuthScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');

  const normalizedPhone = useMemo(() => {
    const digits = phone.replace(/\D/g, '');
    return digits.length === 10 ? `+92${digits}` : `+92${digits.slice(0, 10)}`;
  }, [phone]);

  const sendOtp = useMutation({
    mutationFn: async () => {
      const response = await api.post('/auth/send-otp', { phone: normalizedPhone });
      return response.data;
    },
    onSuccess: () => {
      router.push({ pathname: '/auth/otp', params: { phone: normalizedPhone } });
    },
    onError: () => {
      Alert.alert('Masla aa gaya', 'OTP bhejne mein masla aa gaya.');
    },
  });

  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      <View className="flex-1 justify-center">
        <Text className="mt-12 text-center text-[28px] font-extrabold text-red">TGMG.</Text>
        <Text className="mb-8 mt-2 text-center text-sm text-ink2">Asli log, asli cheezein</Text>

        <Text className="mb-2 text-[15px] font-semibold text-ink">Apna number daalo</Text>
        <View className="flex-row">
          <View className="items-center justify-center rounded-l-xl border border-r-0 border-border bg-[#F5F6F7] px-3 py-3">
            <Text className="text-[15px] text-ink">+92</Text>
          </View>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            className="flex-1 rounded-r-xl border border-border px-4 py-3 text-[15px] text-ink"
            keyboardType="number-pad"
            maxLength={10}
            placeholder="3001234567"
          />
        </View>

        <Pressable
          disabled={sendOtp.isPending || normalizedPhone.length !== 13}
          onPress={() => sendOtp.mutate()}
          className={`mt-4 rounded-xl py-3.5 ${
            sendOtp.isPending || normalizedPhone.length !== 13 ? 'bg-border' : 'bg-red'
          }`}
        >
          <Text className="text-center text-[16px] font-bold text-white">
            {sendOtp.isPending ? 'OTP bhej rahe hain...' : 'OTP Bhejo'}
          </Text>
        </Pressable>

        <Text className="mt-4 text-center text-xs text-ink2">
          Aapka number kisi ke saath share nahi hoga
        </Text>
      </View>
    </SafeAreaView>
  );
}
