'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmationResult, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { getFirebaseAuth } from '../../lib/firebase';

declare global {
  interface Window {
    tgmgRecaptchaVerifier?: RecaptchaVerifier;
  }
}

const OTP_RESEND_SECONDS = 90;

function formatTimer(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function extractApiMessage(error: any, fallback: string) {
  const code = error?.code as string | undefined;
  if (code === 'auth/invalid-phone-number') return 'Phone number format sahi nahi hai';
  if (code === 'auth/too-many-requests') return 'Bohat zyada attempts hue hain, thori dair baad koshish karein';
  if (code === 'auth/invalid-verification-code') return 'OTP ghalat hai';
  if (code === 'auth/code-expired') return 'OTP expire ho gaya, dobara bhejein';
  if (code === 'auth/captcha-check-failed') return 'Verification check complete nahi hua, dobara try karein';
  const message = error?.response?.data?.message;
  if (Array.isArray(message) && message.length > 0) return String(message[0]);
  if (typeof message === 'string' && message.trim()) return message;
  return fallback;
}

export function AuthPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';
  const { setToken } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('signup');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const fullPhone = useMemo(() => `+92${phone.replace(/\D/g, '').slice(0, 10)}`, [phone]);
  const otp = digits.join('');

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setInterval(() => {
      setResendIn((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  const getOrCreateRecaptcha = () => {
    const auth = getFirebaseAuth();
    if (!auth) return null;

    if (!window.tgmgRecaptchaVerifier) {
      window.tgmgRecaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
    }
    return window.tgmgRecaptchaVerifier;
  };

  const sendSignupOtp = async () => {
    if (phone.length !== 10) {
      setMessage('Sahi phone number dalo: 3001234567');
      return;
    }
    if (resendIn > 0) {
      setMessage(`OTP dobara bhejne ke liye ${formatTimer(resendIn)} wait karein`);
      return;
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      setMessage('Service temporarily unavailable hai, thori dair baad dobara try karein');
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const verifier = getOrCreateRecaptcha();
      if (!verifier) {
        setMessage('Verification service start nahi ho saki, dobara try karein');
        return;
      }

      const confirmation = await signInWithPhoneNumber(auth, fullPhone, verifier);
      setConfirmationResult(confirmation);
      setOtpSent(true);
      setDigits(['', '', '', '', '', '']);
      setResendIn(OTP_RESEND_SECONDS);
      setMessage('OTP bhej di gayi hai');
      window.setTimeout(() => inputsRef.current[0]?.focus(), 50);
    } catch (error: any) {
      setMessage(extractApiMessage(error, 'OTP bhejne mein masla aaya'));
    } finally {
      setLoading(false);
    }
  };

  const sendForgotOtp = async () => {
    if (phone.length !== 10) {
      setMessage('Sahi phone number dalo: 3001234567');
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await api.post('/auth/forgot-password/send-otp', { phone: fullPhone });
      setOtpSent(true);
      setDigits(['', '', '', '', '', '']);
      setResendIn(OTP_RESEND_SECONDS);
      setMessage('Password reset OTP bhej di gayi hai');
      window.setTimeout(() => inputsRef.current[0]?.focus(), 50);
    } catch (error: any) {
      setMessage(extractApiMessage(error, 'OTP bhejne mein masla aaya'));
    } finally {
      setLoading(false);
    }
  };

  const signUp = async () => {
    if (!otpSent || !confirmationResult) {
      setMessage('Pehle OTP bhejo');
      return;
    }
    if (otp.length !== 6) {
      setMessage('6 digit OTP dalo');
      return;
    }
    if (!name.trim() || !email.trim()) {
      setMessage('Naam aur email required hain');
      return;
    }
    if (password.length < 8 || password !== confirmPassword) {
      setMessage('Password minimum 8 characters aur matching hone chahiye');
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const credential = await confirmationResult.confirm(otp);
      const firebaseIdToken = await credential.user.getIdToken();
      const response = await api.post('/auth/verify-otp', {
        phone: fullPhone,
        firebaseIdToken,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
      });
      setToken(response.data.accessToken);
      setShowSuccess(true);
      window.setTimeout(() => {
        setShowSuccess(false);
        router.replace(next);
      }, 1500);
    } catch (error: any) {
      setMessage(extractApiMessage(error, 'Account create nahi hua'));
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!otpSent || otp.length !== 6) {
      setMessage('OTP enter karein');
      return;
    }
    if (password.length < 8 || password !== confirmPassword) {
      setMessage('Password minimum 8 characters aur matching hone chahiye');
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const response = await api.post('/auth/forgot-password/reset', {
        phone: fullPhone,
        otpCode: otp,
        password,
        confirmPassword,
      });
      setToken(response.data.accessToken);
      router.replace(next);
    } catch (error: any) {
      setMessage(extractApiMessage(error, 'Password reset nahi hua'));
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
      setMessage(extractApiMessage(error, 'Sign in nahi hua'));
    } finally {
      setLoading(false);
    }
  };

  const otpFields = (
    <div className="mt-4 text-left">
      <div className="mb-2 flex items-center justify-between">
        <label className="block text-sm font-semibold text-ink2">OTP</label>
        <span className="text-xs font-semibold text-ink2">Remaining: {formatTimer(resendIn)}</span>
      </div>
      <div className="flex justify-between gap-2">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(element) => {
              inputsRef.current[index] = element;
            }}
            value={digit}
            onChange={(event) => {
              const value = event.target.value.replace(/\D/g, '').slice(-1);
              setDigits((current) => {
                const nextDigits = [...current];
                nextDigits[index] = value;
                return nextDigits;
              });
              if (value && index < 5) inputsRef.current[index + 1]?.focus();
            }}
            onKeyDown={(event) => {
              if (event.key === 'Backspace' && !digits[index] && index > 0) {
                inputsRef.current[index - 1]?.focus();
              }
            }}
            className="h-12 w-12 rounded-xl border border-border text-center text-lg font-bold outline-none"
            inputMode="numeric"
            maxLength={1}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[calc(100vh-52px)] items-center justify-center px-4 py-8 md:min-h-[calc(100vh-60px)]">
      <div className="surface w-full max-w-md p-6 text-center">
        <div className="text-3xl font-extrabold text-red">TGMG.</div>
        <h1 className="mt-3 text-2xl font-extrabold text-ink">Login, Sign Up, ya Password Reset</h1>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-[#F8F9FB] p-1">
          {(['login', 'signup', 'forgot'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value);
                setMessage(null);
                setOtpSent(false);
                setDigits(['', '', '', '', '', '']);
              }}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                mode === value ? 'bg-white text-ink shadow-card' : 'text-ink2'
              }`}
            >
              {value === 'login' ? 'Sign In' : value === 'signup' ? 'Sign Up' : 'Forgot'}
            </button>
          ))}
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
              <input value={name} onChange={(event) => setName(event.target.value)} className="field-input" placeholder="Apna naam" />
            </div>
            <div className="mt-3 text-left">
              <label className="mb-2 block text-sm font-semibold text-ink2">Email</label>
              <input value={email} onChange={(event) => setEmail(event.target.value)} className="field-input" type="email" placeholder="you@example.com" />
            </div>
            <div className="mt-3 text-left">
              <label className="mb-2 block text-sm font-semibold text-ink2">Password</label>
              <input value={password} onChange={(event) => setPassword(event.target.value)} className="field-input" type="password" placeholder="Minimum 8 characters" />
            </div>
            <div className="mt-3 text-left">
              <label className="mb-2 block text-sm font-semibold text-ink2">Confirm Password</label>
              <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="field-input" type="password" placeholder="Password dobara likho" />
            </div>
            <button type="button" onClick={sendSignupOtp} className="btn-white mt-4 w-full" disabled={loading || resendIn > 0}>
              {otpSent && resendIn > 0 ? `OTP dobara bhejo (${formatTimer(resendIn)})` : 'OTP Bhejo'}
            </button>
            {otpSent ? otpFields : null}
            <button type="button" onClick={signUp} className="btn-red mt-4 w-full" disabled={loading}>
              Account Create Karo
            </button>
            <div id="recaptcha-container" />
          </>
        ) : null}

        {mode === 'login' ? (
          <>
            <div className="mt-5 text-left">
              <label className="mb-2 block text-sm font-semibold text-ink2">Email</label>
              <input value={email} onChange={(event) => setEmail(event.target.value)} className="field-input" type="email" placeholder="you@example.com" />
            </div>
            <div className="mt-3 text-left">
              <label className="mb-2 block text-sm font-semibold text-ink2">Password</label>
              <input value={password} onChange={(event) => setPassword(event.target.value)} className="field-input" type="password" placeholder="Password" />
            </div>
            <button type="button" onClick={signIn} className="btn-red mt-4 w-full" disabled={loading}>
              Sign In
            </button>
          </>
        ) : null}

        {mode === 'forgot' ? (
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
              <label className="mb-2 block text-sm font-semibold text-ink2">New Password</label>
              <input value={password} onChange={(event) => setPassword(event.target.value)} className="field-input" type="password" placeholder="Minimum 8 characters" />
            </div>
            <div className="mt-3 text-left">
              <label className="mb-2 block text-sm font-semibold text-ink2">Confirm Password</label>
              <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="field-input" type="password" placeholder="Password dobara likho" />
            </div>
            <button type="button" onClick={sendForgotOtp} className="btn-white mt-4 w-full" disabled={loading || resendIn > 0}>
              {otpSent && resendIn > 0 ? `OTP dobara bhejo (${formatTimer(resendIn)})` : 'Reset OTP Bhejo'}
            </button>
            {otpSent ? otpFields : null}
            <button type="button" onClick={resetPassword} className="btn-red mt-4 w-full" disabled={loading}>
              Naya Password Set Karo
            </button>
          </>
        ) : null}

        {message ? <div className="mt-4 text-sm text-ink2">{message}</div> : null}
      </div>
      {showSuccess ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 px-4">
          <div className="surface w-full max-w-sm p-6 text-center">
            <div className="text-2xl font-extrabold text-green">Account ready</div>
            <div className="mt-2 text-sm text-ink2">Aapka account create ho gaya.</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
