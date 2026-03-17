import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, Text, TextInput } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';

export default function OtpScreen() {
  const router = useRouter();
  const { phone, mode, name: initialName, email: initialEmail, password: initialPassword, confirmPassword: initialConfirmPassword } =
    useLocalSearchParams<{
      phone: string;
      mode?: 'signup' | 'forgot';
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    }>();
  const { setToken } = useAuth();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(30);
  const [name, setName] = useState(initialName ?? '');
  const [email, setEmail] = useState(initialEmail ?? '');
  const [password, setPassword] = useState(initialPassword ?? '');
  const [confirmPassword, setConfirmPassword] = useState(initialConfirmPassword ?? '');
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
      const endpoint = mode === 'forgot' ? '/auth/forgot-password/reset' : '/auth/verify-otp';
      const payload =
        mode === 'forgot'
          ? {
              phone,
              otpCode: code,
              password,
              confirmPassword,
            }
          : {
              phone,
              otpCode: code,
              name: name.trim(),
              email: email.trim().toLowerCase(),
              password,
              confirmPassword,
            };
      const response = await api.post(endpoint, payload);
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.accessToken) {
        setToken(data.accessToken);
      }
      router.replace('/(tabs)');
    },
    onError: () => {
      Alert.alert('Verify failed', 'OTP ya details ghalat hain.');
    },
  });

  const resendOtp = useMutation({
    mutationFn: async () => {
      const response = await api.post(
        mode === 'forgot' ? '/auth/forgot-password/send-otp' : '/auth/send-otp',
        { phone },
      );
      return response.data;
    },
    onSuccess: () => setCountdown(30),
  });

  const disabled =
    verifyOtp.isPending ||
    code.length !== 6 ||
    password.length < 8 ||
    confirmPassword.length < 8 ||
    (mode !== 'forgot' && (!name.trim() || !email.trim()));

  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 32 }}>
        <Text className="text-center text-[28px] font-extrabold text-red">TGMG.</Text>
        <Text className="mb-2 mt-6 text-center text-sm text-ink2">OTP {maskedPhone} par bheji gayi</Text>

        <Text className="mb-3 text-center text-xs text-ink2">
          {mode === 'forgot' ? 'Password reset complete karein' : 'Account details complete karein'}
        </Text>

        <Text className="mb-3 text-sm font-semibold text-ink">6 digit OTP</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
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
        </ScrollView>

        {mode === 'signup' ? (
          <>
            <TextInput
              value={name}
              onChangeText={setName}
              className="mt-6 rounded-xl border border-border px-4 py-3 text-[15px] text-ink"
              placeholder="Aapka naam"
            />
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              className="mt-3 rounded-xl border border-border px-4 py-3 text-[15px] text-ink"
              placeholder="Email address"
            />
          </>
        ) : null}

        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          className="mt-3 rounded-xl border border-border px-4 py-3 text-[15px] text-ink"
          placeholder={mode === 'forgot' ? 'Naya password' : 'Password'}
        />
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          className="mt-3 rounded-xl border border-border px-4 py-3 text-[15px] text-ink"
          placeholder="Confirm password"
        />

        <Pressable
          disabled={disabled}
          onPress={() => verifyOtp.mutate()}
          className={`mt-6 rounded-xl py-3.5 ${disabled ? 'bg-border' : 'bg-red'}`}
        >
          <Text className="text-center text-[16px] font-bold text-white">
            {verifyOtp.isPending ? 'Verify ho raha hai...' : mode === 'forgot' ? 'Password Reset Karo' : 'Account Banao'}
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
      </ScrollView>
    </SafeAreaView>
  );
}
