import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, SafeAreaView, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';

export default function PhoneAuthScreen() {
  const router = useRouter();
  const { setToken } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const normalizedPhone = useMemo(() => {
    const digits = phone.replace(/\D/g, '');
    return digits.length === 10 ? `+92${digits}` : `+92${digits.slice(0, 10)}`;
  }, [phone]);

  const sendSignupOtp = useMutation({
    mutationFn: async () => {
      const response = await api.post('/auth/send-otp', { phone: normalizedPhone });
      return response.data;
    },
    onSuccess: () => {
      router.push({ pathname: '/auth/otp', params: { phone: normalizedPhone, mode: 'signup' } });
    },
    onError: () => {
      Alert.alert('Masla aa gaya', 'OTP bhejne mein masla aa gaya.');
    },
  });

  const sendForgotOtp = useMutation({
    mutationFn: async () => {
      const response = await api.post('/auth/forgot-password/send-otp', { phone: normalizedPhone });
      return response.data;
    },
    onSuccess: () => {
      router.push({ pathname: '/auth/otp', params: { phone: normalizedPhone, mode: 'forgot' } });
    },
    onError: () => {
      Alert.alert('Masla aa gaya', 'Reset OTP bhejne mein masla aa gaya.');
    },
  });

  const signIn = useMutation({
    mutationFn: async () => {
      const response = await api.post('/auth/sign-in', {
        email: email.trim().toLowerCase(),
        password,
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
      Alert.alert('Login failed', 'Email ya password ghalat hai.');
    },
  });

  const otpBusy = sendSignupOtp.isPending || sendForgotOtp.isPending;
  const otpDisabled = normalizedPhone.length !== 13 || otpBusy;

  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      <View className="flex-1 justify-center">
        <Text className="mt-12 text-center text-[28px] font-extrabold text-red">TGMG.</Text>
        <Text className="mb-8 mt-2 text-center text-sm text-ink2">Asli log, asli cheezein</Text>

        <View className="mb-6 flex-row rounded-xl bg-[#F5F6F7] p-1">
          {[
            { key: 'signin', label: 'Sign In' },
            { key: 'signup', label: 'Sign Up' },
            { key: 'forgot', label: 'Forgot' },
          ].map((item) => (
            <Pressable
              key={item.key}
              onPress={() => setMode(item.key as typeof mode)}
              className={`flex-1 rounded-lg px-3 py-2 ${mode === item.key ? 'bg-white' : ''}`}
            >
              <Text className={`text-center text-xs font-semibold ${mode === item.key ? 'text-red' : 'text-ink2'}`}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {mode === 'signin' ? (
          <>
            <Text className="mb-2 text-[15px] font-semibold text-ink">Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              className="rounded-xl border border-border px-4 py-3 text-[15px] text-ink"
              placeholder="name@email.com"
            />

            <Text className="mb-2 mt-4 text-[15px] font-semibold text-ink">Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              className="rounded-xl border border-border px-4 py-3 text-[15px] text-ink"
              placeholder="Apna password"
            />

            <Pressable
              disabled={signIn.isPending || !email.trim() || password.length < 8}
              onPress={() => signIn.mutate()}
              className={`mt-4 rounded-xl py-3.5 ${
                signIn.isPending || !email.trim() || password.length < 8 ? 'bg-border' : 'bg-red'
              }`}
            >
              <Text className="text-center text-[16px] font-bold text-white">
                {signIn.isPending ? 'Login ho raha hai...' : 'Login Karo'}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text className="mb-2 text-[15px] font-semibold text-ink">
              {mode === 'signup' ? 'Apna number daalo' : 'Reset ke liye number daalo'}
            </Text>
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
              disabled={otpDisabled}
              onPress={() => (mode === 'signup' ? sendSignupOtp.mutate() : sendForgotOtp.mutate())}
              className={`mt-4 rounded-xl py-3.5 ${otpDisabled ? 'bg-border' : 'bg-red'}`}
            >
              <Text className="text-center text-[16px] font-bold text-white">
                {mode === 'signup'
                  ? sendSignupOtp.isPending
                    ? 'OTP bhej rahe hain...'
                    : 'OTP Bhejo'
                  : sendForgotOtp.isPending
                    ? 'OTP bhej rahe hain...'
                    : 'Reset OTP Bhejo'}
              </Text>
            </Pressable>
          </>
        )}

        <Text className="mt-4 text-center text-xs text-ink2">
          Aapka number kisi ke saath share nahi hoga
        </Text>
      </View>
    </SafeAreaView>
  );
}
