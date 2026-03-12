'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

export function AuthPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';
  const { setToken } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fullPhone = useMemo(() => `+92${phone.replace(/\D/g, '').slice(0, 10)}`, [phone]);
  const otp = digits.join('');

  const sendOtp = async () => {
    if (phone.length !== 10) {
      setMessage('Sahi phone number dalo: 3001234567');
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await api.post('/auth/send-otp', { phone: fullPhone });
      setOtpSent(true);
      if (response.data?.devOtp) {
        setMessage(`OTP bhej di gayi hai (dev): ${response.data.devOtp}`);
      } else {
        setMessage('OTP bhej di gayi hai');
      }
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'OTP bhejne mein masla aaya');
    } finally {
      setLoading(false);
    }
  };

  const signUp = async () => {
    if (!otpSent) {
      setMessage('Pehle OTP bhejo');
      return;
    }
    if (otp.length !== 6) {
      setMessage('6 digit OTP dalo');
      return;
    }
    if (!name.trim()) {
      setMessage('Profile name required hai');
      return;
    }
    if (!email.trim()) {
      setMessage('Email required hai');
      return;
    }
    if (password.length < 8) {
      setMessage('Password minimum 8 characters ka hona chahiye');
      return;
    }
    if (password !== confirmPassword) {
      setMessage('Password aur confirm password match nahi karte');
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await api.post('/auth/verify-otp', {
        phone: fullPhone,
        otpCode: otp,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
      });
      setToken(response.data.accessToken);
      router.replace(next);
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Account create nahi hua');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async () => {
    if (!email.trim() || !password) {
      setMessage('Email aur password dalo');
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await api.post('/auth/sign-in', {
        email: email.trim().toLowerCase(),
        password,
      });
      setToken(response.data.accessToken);
      router.replace(next);
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Sign in nahi hua');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-52px)] items-center justify-center px-4 py-8 md:min-h-[calc(100vh-60px)]">
      <div className="surface w-full max-w-md p-6 text-center">
        <div className="text-3xl font-extrabold text-red">TGMG.</div>
        <h1 className="mt-3 text-2xl font-extrabold text-ink">Login ya Sign Up karo</h1>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-[#F8F9FB] p-1">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setMessage(null);
            }}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === 'login' ? 'bg-white text-ink shadow-card' : 'text-ink2'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setMessage(null);
            }}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === 'signup' ? 'bg-white text-ink shadow-card' : 'text-ink2'}`}
          >
            Sign Up
          </button>
        </div>

        {mode === 'signup' ? (
          <>
            <div className="mt-5 text-left">
              <label className="mb-2 block text-sm font-semibold text-ink2">Phone</label>
              <div className="field-input flex items-center gap-2">
                <span className="font-bold text-red">+92</span>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="min-w-0 flex-1 border-0 bg-transparent outline-none"
                  placeholder="3001234567"
                />
              </div>
            </div>

            <div className="mt-3 text-left">
              <label className="mb-2 block text-sm font-semibold text-ink2">Profile Name</label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="field-input"
                placeholder="Apna naam"
              />
            </div>

            <div className="mt-3 text-left">
              <label className="mb-2 block text-sm font-semibold text-ink2">Email</label>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="field-input"
                type="email"
                placeholder="you@example.com"
              />
            </div>

            <div className="mt-3 text-left">
              <label className="mb-2 block text-sm font-semibold text-ink2">Password</label>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="field-input"
                type="password"
                placeholder="Minimum 8 characters"
              />
            </div>

            <div className="mt-3 text-left">
              <label className="mb-2 block text-sm font-semibold text-ink2">Confirm Password</label>
              <input
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="field-input"
                type="password"
                placeholder="Password dobara likho"
              />
            </div>

            <button type="button" onClick={sendOtp} className="btn-white mt-4 w-full" disabled={loading}>
              OTP Bhejo
            </button>

            {otpSent ? (
              <div className="mt-4 text-left">
                <label className="mb-2 block text-sm font-semibold text-ink2">OTP</label>
                <div className="flex justify-between gap-2">
                  {digits.map((digit, index) => (
                    <input
                      key={index}
                      value={digit}
                      onChange={(event) => {
                        const value = event.target.value.replace(/\D/g, '').slice(-1);
                        setDigits((current) =>
                          current.map((item, itemIndex) => (itemIndex === index ? value : item)),
                        );
                      }}
                      className="h-12 w-12 rounded-xl border border-border text-center text-lg font-bold outline-none"
                      inputMode="numeric"
                      maxLength={1}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <button type="button" onClick={signUp} className="btn-red mt-4 w-full" disabled={loading}>
              Account Create Karo
            </button>
          </>
        ) : (
          <>
            <div className="mt-5 text-left">
              <label className="mb-2 block text-sm font-semibold text-ink2">Email</label>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="field-input"
                type="email"
                placeholder="you@example.com"
              />
            </div>

            <div className="mt-3 text-left">
              <label className="mb-2 block text-sm font-semibold text-ink2">Password</label>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="field-input"
                type="password"
                placeholder="Password"
              />
            </div>

            <button type="button" onClick={signIn} className="btn-red mt-4 w-full" disabled={loading}>
              Sign In
            </button>
          </>
        )}

        {message ? <div className="mt-4 text-sm text-ink2">{message}</div> : null}
      </div>
    </div>
  );
}
