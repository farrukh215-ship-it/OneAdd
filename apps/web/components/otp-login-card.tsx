"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "firebase/auth";
import { ApiError, verifyFirebaseLogin } from "../lib/api";
import { getFirebaseAuth, isFirebaseConfigured } from "../lib/firebase";

const phonePattern = /^\+92[0-9]{10}$/;
const otpResendSeconds = 60;

function normalizePhoneInput(raw: string) {
  const digits = raw.replace(/\D/g, "");
  let national = "";

  if (digits.startsWith("92")) {
    national = digits.slice(2, 12);
  } else if (digits.startsWith("0")) {
    national = digits.slice(1, 11);
  } else {
    national = digits.slice(0, 10);
  }

  return `+92${national}`;
}

export function OtpLoginCard() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+92");
  const [otp, setOtp] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [otpResendIn, setOtpResendIn] = useState(0);
  const [loading, setLoading] = useState(false);

  const recaptchaElementRef = useRef<HTMLDivElement | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  const canRequestOtp = useMemo(() => {
    return email.includes("@") && phonePattern.test(phone.trim());
  }, [email, phone]);

  useEffect(() => {
    if (!isFirebaseConfigured() || !recaptchaElementRef.current) {
      return;
    }

    const auth = getFirebaseAuth();
    recaptchaVerifierRef.current = new RecaptchaVerifier(
      auth,
      recaptchaElementRef.current,
      { size: "invisible" }
    );

    return () => {
      recaptchaVerifierRef.current?.clear();
      recaptchaVerifierRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (otpResendIn <= 0) return;
    const timer = window.setTimeout(() => {
      setOtpResendIn((prev) => prev - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [otpResendIn]);

  async function requestFirebaseOtp() {
    if (!isFirebaseConfigured()) {
      throw new Error("Firebase config missing hai. apps/web/.env.local set karein.");
    }
    if (!recaptchaVerifierRef.current) {
      throw new Error("reCAPTCHA initialize nahi hua. Page refresh karein.");
    }

    const auth = getFirebaseAuth();
    const confirmation = await signInWithPhoneNumber(
      auth,
      phone.trim(),
      recaptchaVerifierRef.current
    );
    confirmationRef.current = confirmation;
    setOtpStep(true);
    setOtpResendIn(otpResendSeconds);
  }

  async function onRequestOtp(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!canRequestOtp) {
      setError("Email aur phone format sahi enter karein.");
      return;
    }

    setLoading(true);
    try {
      await requestFirebaseOtp();
      setMessage("OTP send ho gaya. 6-digit code verify karein.");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("OTP request failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function onResendOtp() {
    if (otpResendIn > 0) return;

    setError("");
    setMessage("");
    setLoading(true);
    try {
      await requestFirebaseOtp();
      setMessage("Naya OTP send kar diya gaya.");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("OTP resend failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function onVerify(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!confirmationRef.current) {
      setError("Pehle OTP request karein.");
      return;
    }
    if (otp.trim().length !== 6) {
      setError("6-digit OTP required hai.");
      return;
    }

    setLoading(true);
    try {
      const credential = await confirmationRef.current.confirm(otp.trim());
      const idToken = await credential.user.getIdToken(true);

      const authResult = await verifyFirebaseLogin(
        {
          idToken,
          email: email.trim().toLowerCase()
        },
        { rememberMe }
      );

      if (authResult.user.email.toLowerCase() !== email.trim().toLowerCase()) {
        setError("Email aur phone account se match nahi kar rahe.");
        return;
      }

      setMessage("Login successful.");
      window.location.reload();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("OTP verification failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel authPanel">
      <div className="authBrandLockup">
        <img src="/brand/zaroratbazar-logo-light.svg" alt="ZaroratBazar" className="authBrandLockupImage" />
        <p className="authBrandTagline">صرف اصل لوگ، اصل چیزیں</p>
      </div>
      <h2>Sign In</h2>
      <form className="stack" onSubmit={onRequestOtp}>
        <input
          className="input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
        <input
          className="input"
          placeholder="+923004203035"
          value={phone}
          onChange={(event) => setPhone(normalizePhoneInput(event.target.value))}
          autoComplete="tel"
          required
        />
        <label className="toggle">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
          />
          <span>Always signed in on this device</span>
        </label>
        <button className="btn" type="submit" disabled={!canRequestOtp || loading}>
          {loading ? "Please wait..." : "Request OTP"}
        </button>
      </form>

      {otpStep ? (
        <form className="stack" onSubmit={onVerify}>
          <input
            className="input"
            placeholder="6-digit OTP"
            value={otp}
            onChange={(event) => setOtp(event.target.value)}
            maxLength={6}
            autoComplete="one-time-code"
            required
          />
          <div className="modalActions">
            <button
              className="btn secondary"
              type="button"
              onClick={onResendOtp}
              disabled={otpResendIn > 0 || loading}
            >
              {otpResendIn > 0 ? `Resend in ${otpResendIn}s` : "Resend OTP"}
            </button>
            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Verifying..." : "Verify & Login"}
            </button>
          </div>
        </form>
      ) : null}

      <div ref={recaptchaElementRef} />

      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}
    </section>
  );
}
