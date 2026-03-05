"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  ApiError,
  confirmPasswordReset,
  loginWithPassword,
  requestPasswordReset,
  verifyPasswordReset
} from "../lib/api";
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
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetPhone, setResetPhone] = useState("+92");
  const [resetOtp, setResetOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpResendIn, setOtpResendIn] = useState(0);
  const [resetStep, setResetStep] = useState<"request" | "otp" | "password">("request");

  const recaptchaElementRef = useRef<HTMLDivElement | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  const canLogin = useMemo(() => email.includes("@") && password.length >= 8, [email, password]);

  useEffect(() => {
    if (otpResendIn <= 0) return;
    const timer = window.setTimeout(() => {
      setOtpResendIn((prev) => prev - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [otpResendIn]);

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

  async function requestFirebaseOtp(phone: string) {
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
    setOtpResendIn(otpResendSeconds);
  }

  async function onLogin(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!canLogin) {
      setError("Valid email aur password required hai.");
      return;
    }

    setLoading(true);
    try {
      await loginWithPassword(
        {
          email: email.trim().toLowerCase(),
          password
        },
        { rememberMe }
      );
      setMessage("Login successful.");
      router.push("/");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Login failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function onResetRequest(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!resetEmail.includes("@")) {
      setError("Valid email required hai.");
      return;
    }
    if (!phonePattern.test(resetPhone.trim())) {
      setError("Phone format +923004203035 hona chahiye.");
      return;
    }

    setLoading(true);
    try {
      await requestPasswordReset({
        email: resetEmail.trim().toLowerCase(),
        phone: resetPhone.trim()
      });
      await requestFirebaseOtp(resetPhone.trim());
      setResetStep("otp");
      setMessage("OTP send ho gaya. 6-digit code verify karein.");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Password reset request failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function onResendResetOtp() {
    if (otpResendIn > 0) return;

    setError("");
    setMessage("");
    setLoading(true);
    try {
      await requestFirebaseOtp(resetPhone.trim());
      setMessage("Naya OTP send kar diya gaya.");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("OTP resend failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyResetOtp(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!confirmationRef.current) {
      setError("Pehle OTP request karein.");
      return;
    }
    if (resetOtp.trim().length !== 6) {
      setError("6-digit OTP required hai.");
      return;
    }

    setLoading(true);
    try {
      const credential = await confirmationRef.current.confirm(resetOtp.trim());
      const idToken = await credential.user.getIdToken(true);
      const verification = await verifyPasswordReset({
        email: resetEmail.trim().toLowerCase(),
        phone: resetPhone.trim(),
        idToken
      });
      setResetToken(verification.resetToken);
      setResetStep("password");
      setMessage("OTP verified. Ab naya password set karein.");
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

  async function onConfirmPasswordReset(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (newPassword.length < 8) {
      setError("Password kam az kam 8 characters ka hona chahiye.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Password aur confirm password match nahi kar rahe.");
      return;
    }
    if (!resetToken) {
      setError("Reset session expire ho gaya. Dobara try karein.");
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset({
        resetToken,
        newPassword
      });
      setForgotOpen(false);
      setResetStep("request");
      setResetToken("");
      setResetOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password reset ho gaya. Ab email/password se login karein.");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Password reset confirm failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel authPanel">
      <div className="authBrandLockup">
        <div className="authBrandLockupText">
          TG<span>MG</span>
        </div>
        <p className="authBrandTagline">Sirf Asli Log. Sirf Ghar Ka Saaman.</p>
      </div>
      <h2>TGMG mein Khush Aamdeed</h2>
      <p className="helperText">Email aur password se login karein.</p>
      <form className="stack" onSubmit={onLogin}>
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
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
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
        <button className="btn" type="submit" disabled={!canLogin || loading}>
          {loading ? "Please wait..." : "Login"}
        </button>
        <button
          className="btn secondary"
          type="button"
          onClick={() => {
            setForgotOpen((prev) => !prev);
            setError("");
            setMessage("");
          }}
        >
          {forgotOpen ? "Close Forgot Password" : "Forgot Password"}
        </button>
      </form>

      {forgotOpen ? (
        <div
          className="modalBackdrop"
          onClick={() => {
            setForgotOpen(false);
            setError("");
          }}
        >
          <div className="modalCard stack" onClick={(event) => event.stopPropagation()}>
            <h3 style={{ margin: 0 }}>Password Reset (Phone OTP)</h3>

            {resetStep === "request" ? (
              <form className="stack" onSubmit={onResetRequest}>
                <input
                  className="input"
                  type="email"
                  placeholder="Account Email"
                  value={resetEmail}
                  onChange={(event) => setResetEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
                <input
                  className="input"
                  placeholder="+923004203035"
                  value={resetPhone}
                  onChange={(event) => setResetPhone(normalizePhoneInput(event.target.value))}
                  autoComplete="tel"
                  required
                />
                <button className="btn" type="submit" disabled={loading}>
                  {loading ? "Please wait..." : "Send OTP"}
                </button>
              </form>
            ) : null}

            {resetStep === "otp" ? (
              <form className="stack" onSubmit={onVerifyResetOtp}>
                <input
                  className="input"
                  placeholder="6-digit OTP"
                  value={resetOtp}
                  onChange={(event) => setResetOtp(event.target.value)}
                  maxLength={6}
                  autoComplete="one-time-code"
                  required
                />
                <div className="modalActions">
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={onResendResetOtp}
                    disabled={otpResendIn > 0 || loading}
                  >
                    {otpResendIn > 0 ? `Resend in ${otpResendIn}s` : "Resend OTP"}
                  </button>
                  <button className="btn" type="submit" disabled={loading}>
                    {loading ? "Verifying..." : "Verify OTP"}
                  </button>
                </div>
              </form>
            ) : null}

            {resetStep === "password" ? (
              <form className="stack" onSubmit={onConfirmPasswordReset}>
                <input
                  className="input"
                  type="password"
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
                <input
                  className="input"
                  type="password"
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button className="btn" type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Set New Password"}
                </button>
              </form>
            ) : null}

            <button
              className="btn secondary"
              type="button"
              onClick={() => {
                setForgotOpen(false);
                setError("");
              }}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      <div ref={recaptchaElementRef} />

      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}
    </section>
  );
}
