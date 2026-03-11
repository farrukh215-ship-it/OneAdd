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
  const [phone, setPhone] = useState('');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fullPhone = useMemo(() => `+92${phone.replace(/\D/g, '').slice(0, 10)}`, [phone]);
  const otp = digits.join('');

  const sendOtp = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await api.post('/auth/send-otp', { phone: fullPhone });
      setSent(true);
      setMessage('OTP bhej di gayi hai');
    } catch {
      setMessage('OTP bhejne mein masla aaya');
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await api.post('/auth/verify-otp', {
        phone: fullPhone,
        firebaseIdToken: otp,
      });
      setToken(response.data.accessToken);
      router.replace(next);
    } catch {
      setMessage('Verify nahi hua. Firebase client token wiring abhi required hai.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-52px)] items-center justify-center px-4 py-8 md:min-h-[calc(100vh-60px)]">
      <div className="surface w-full max-w-md p-6 text-center">
        <div className="text-3xl font-extrabold text-red">TGMG.</div>
        <h1 className="mt-3 text-2xl font-extrabold text-ink">Login ya Sign Up karo</h1>
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
        <button type="button" onClick={sendOtp} className="btn-red mt-4 w-full" disabled={loading}>
          OTP Bhejo
        </button>
        {sent ? (
          <>
            <div className="mt-5 text-left">
              <label className="mb-2 block text-sm font-semibold text-ink2">OTP</label>
              <div className="flex justify-between gap-2">
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    value={digit}
                    onChange={(event) => {
                      const value = event.target.value.replace(/\D/g, '').slice(-1);
                      setDigits((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
                    }}
                    className="h-12 w-12 rounded-xl border border-border text-center text-lg font-bold outline-none"
                    inputMode="numeric"
                    maxLength={1}
                  />
                ))}
              </div>
            </div>
            <button type="button" onClick={verify} className="btn-red mt-4 w-full" disabled={loading}>
              Verify Karo
            </button>
          </>
        ) : null}
        {message ? <div className="mt-4 text-sm text-ink2">{message}</div> : null}
      </div>
    </div>
  );
}
