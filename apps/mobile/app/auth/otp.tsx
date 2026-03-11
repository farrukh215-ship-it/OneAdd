import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, SafeAreaView, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';

export default function OtpScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { setToken } = useAuth();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(30);
  const inputs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const code = useMemo(() => digits.join(''), [digits]);
  const maskedPhone = phone ? `${phone.slice(0, 5)}*****${phone.slice(-2)}` : '';

  const verifyOtp = useMutation({
    mutationFn: async () => {
      const response = await api.post('/auth/verify-otp', {
        phone,
        firebaseIdToken: code,
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.accessToken) {
        setToken(data.accessToken);
      }
      router.replace('/(tabs)');
    },
    onError: () => {
      Alert.alert('Verify failed', 'OTP verify ke liye Firebase ID token wiring abhi baki hai.');
    },
  });

  const resendOtp = useMutation({
    mutationFn: async () => {
      const response = await api.post('/auth/send-otp', { phone });
      return response.data;
    },
    onSuccess: () => setCountdown(30),
  });

  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      <View className="flex-1 justify-center">
        <Text className="text-center text-[28px] font-extrabold text-red">TGMG.</Text>
        <Text className="mb-2 mt-6 text-center text-sm text-ink2">OTP {maskedPhone} par bheji gayi</Text>

        <View className="mt-6 flex-row justify-between">
          {digits.map((digit, index) => (
            <TextInput
              key={index}
              ref={(element) => {
                inputs.current[index] = element;
              }}
              value={digit}
              onChangeText={(value) => {
                const nextDigits = [...digits];
                nextDigits[index] = value.slice(-1);
                setDigits(nextDigits);
                if (value && index < 5) {
                  inputs.current[index + 1]?.focus();
                }
              }}
              maxLength={1}
              keyboardType="number-pad"
              className="h-14 w-12 rounded-xl border border-border text-center text-lg font-bold text-ink"
            />
          ))}
        </View>

        <Pressable
          disabled={verifyOtp.isPending || code.length !== 6}
          onPress={() => verifyOtp.mutate()}
          className={`mt-6 rounded-xl py-3.5 ${verifyOtp.isPending || code.length !== 6 ? 'bg-border' : 'bg-red'}`}
        >
          <Text className="text-center text-[16px] font-bold text-white">
            {verifyOtp.isPending ? 'Verify ho raha hai...' : 'Verify Karo'}
          </Text>
        </Pressable>

        <Pressable
          disabled={countdown > 0 || resendOtp.isPending}
          onPress={() => resendOtp.mutate()}
          className="mt-4"
        >
          <Text className="text-center text-sm font-semibold text-red">
            {countdown > 0 ? `OTP dobara bhejo (${countdown}s)` : 'OTP dobara bhejo'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
