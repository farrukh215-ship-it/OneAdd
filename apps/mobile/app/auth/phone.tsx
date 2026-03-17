import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';
import { extractApiMessage, getPkPhoneLocalPart, normalizePkPhone } from '../../lib/auth-utils';

export default function PhoneAuthScreen() {
  const router = useRouter();
  const { setToken } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const localPhone = useMemo(() => getPkPhoneLocalPart(phone), [phone]);
  const normalizedPhone = useMemo(() => normalizePkPhone(phone), [phone]);

  const sendSignupOtp = useMutation({
    mutationFn: async () => {
      const response = await api.post('/auth/send-otp', { phone: normalizedPhone });
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.devOtp) {
        Alert.alert('Dev OTP', `OTP: ${data.devOtp}`);
      }
      router.push({
        pathname: '/auth/otp',
        params: {
          phone: normalizedPhone,
          mode: 'signup',
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          confirmPassword,
        },
      });
    },
    onError: (error) => {
      Alert.alert('Masla aa gaya', extractApiMessage(error, 'OTP bhejne mein masla aa gaya.'));
    },
  });

  const sendForgotOtp = useMutation({
    mutationFn: async () => {
      const response = await api.post('/auth/forgot-password/send-otp', { phone: normalizedPhone });
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.devOtp) {
        Alert.alert('Dev OTP', `OTP: ${data.devOtp}`);
      }
      router.push({ pathname: '/auth/otp', params: { phone: normalizedPhone, mode: 'forgot' } });
    },
    onError: (error) => {
      Alert.alert('Masla aa gaya', extractApiMessage(error, 'Reset OTP bhejne mein masla aa gaya.'));
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
      if (data?.accessToken) setToken(data.accessToken);
      router.replace('/(tabs)');
    },
    onError: () => {
      Alert.alert('Login failed', 'Email ya password ghalat hai.');
    },
  });

  const otpBusy = sendSignupOtp.isPending || sendForgotOtp.isPending;
  const otpDisabled = localPhone.length !== 10 || otpBusy;
  const signInDisabled = signIn.isPending || !email.trim() || password.length < 8;
  const signUpDisabled =
    otpDisabled ||
    !name.trim() ||
    !email.trim() ||
    password.length < 8 ||
    confirmPassword.length < 8 ||
    password !== confirmPassword;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.brand}>TGMG.</Text>
          <Text style={styles.heading}>Login, Sign Up, ya Password Reset</Text>

          <View style={styles.modeSwitch}>
            {[
              { key: 'signin', label: 'Sign In' },
              { key: 'signup', label: 'Sign Up' },
              { key: 'forgot', label: 'Forgot' },
            ].map((item) => {
              const active = mode === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setMode(item.key as typeof mode)}
                  style={[styles.modeButton, active && styles.modeButtonActive]}
                >
                  <Text style={[styles.modeButtonText, active && styles.modeButtonTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {mode === 'signin' ? (
            <>
              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#9AA1A9"
              />

              <Text style={styles.label}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#9AA1A9"
              />

              <Pressable disabled={signInDisabled} onPress={() => signIn.mutate()} style={[styles.primaryButton, signInDisabled && styles.disabledButton]}>
                <Text style={styles.primaryButtonText}>{signIn.isPending ? 'Login ho raha hai...' : 'Sign In'}</Text>
              </Pressable>
            </>
          ) : null}

          {mode === 'signup' ? (
            <>
              <Text style={styles.label}>Phone</Text>
              <View style={styles.phoneRow}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>+92</Text>
                </View>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  style={styles.phoneInput}
                  keyboardType="number-pad"
                  maxLength={13}
                  placeholder="3001234567"
                  placeholderTextColor="#9AA1A9"
                />
              </View>

              <Text style={styles.label}>Profile Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholder="Apna naam"
                placeholderTextColor="#9AA1A9"
              />

              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#9AA1A9"
              />

              <Text style={styles.label}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
                placeholder="Minimum 8 characters"
                placeholderTextColor="#9AA1A9"
              />

              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                style={styles.input}
                placeholder="Password dobara likho"
                placeholderTextColor="#9AA1A9"
              />

              <Pressable disabled={signUpDisabled} onPress={() => sendSignupOtp.mutate()} style={[styles.secondaryButton, signUpDisabled && styles.disabledOutlineButton]}>
                <Text style={styles.secondaryButtonText}>
                  {sendSignupOtp.isPending ? 'OTP bhej rahe hain...' : 'OTP Bhejo'}
                </Text>
              </Pressable>

              <Pressable disabled={signUpDisabled} onPress={() => sendSignupOtp.mutate()} style={[styles.primaryButton, signUpDisabled && styles.disabledButton]}>
                <Text style={styles.primaryButtonText}>Account Create Karo</Text>
              </Pressable>
            </>
          ) : null}

          {mode === 'forgot' ? (
            <>
              <Text style={styles.label}>Phone</Text>
              <View style={styles.phoneRow}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>+92</Text>
                </View>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  style={styles.phoneInput}
                  keyboardType="number-pad"
                  maxLength={13}
                  placeholder="3001234567"
                  placeholderTextColor="#9AA1A9"
                />
              </View>

              <Text style={styles.label}>New Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
                placeholder="Minimum 8 characters"
                placeholderTextColor="#9AA1A9"
              />

              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                style={styles.input}
                placeholder="Password dobara likho"
                placeholderTextColor="#9AA1A9"
              />

              <Pressable disabled={otpDisabled} onPress={() => sendForgotOtp.mutate()} style={[styles.primaryButton, otpDisabled && styles.disabledButton]}>
                <Text style={styles.primaryButtonText}>
                  {sendForgotOtp.isPending ? 'OTP bhej rahe hain...' : 'Reset OTP Bhejo'}
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F0F2F5',
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  brand: {
    color: '#E53935',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  heading: {
    color: '#1C1E21',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 14,
    textAlign: 'center',
  },
  modeSwitch: {
    backgroundColor: '#F5F6F7',
    borderRadius: 16,
    flexDirection: 'row',
    marginTop: 18,
    padding: 4,
  },
  modeButton: {
    borderRadius: 12,
    flex: 1,
    paddingVertical: 11,
  },
  modeButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  modeButtonText: {
    color: '#65676B',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  modeButtonTextActive: {
    color: '#1C1E21',
  },
  label: {
    color: '#65676B',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    backgroundColor: '#F8F9FB',
    borderColor: '#E4E6EB',
    borderRadius: 18,
    borderWidth: 1,
    color: '#1C1E21',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  phoneRow: {
    flexDirection: 'row',
  },
  countryCode: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 18,
    borderColor: '#E4E6EB',
    borderTopLeftRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  countryCodeText: {
    color: '#E53935',
    fontSize: 16,
    fontWeight: '800',
  },
  phoneInput: {
    backgroundColor: '#F8F9FB',
    borderBottomRightRadius: 18,
    borderColor: '#E4E6EB',
    borderLeftWidth: 0,
    borderTopRightRadius: 18,
    borderWidth: 1,
    color: '#1C1E21',
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  primaryButton: {
    backgroundColor: '#E53935',
    borderRadius: 16,
    marginTop: 14,
    paddingVertical: 14,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E6EB',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 14,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  secondaryButtonText: {
    color: '#1C1E21',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: '#BEC3C9',
  },
  disabledOutlineButton: {
    backgroundColor: '#F5F6F7',
    borderColor: '#E4E6EB',
  },
});
