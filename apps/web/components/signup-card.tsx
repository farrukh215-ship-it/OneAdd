"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, requestOtp, signup, verifyOtp } from "../lib/api";
import { toUserFriendlyAuthError } from "../lib/auth-error";

type SignupFormState = {
  fullName: string;
  fatherName: string;
  cnic: string;
  email: string;
  password: string;
  confirmPassword: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  phone: string;
};

const phonePattern = /^\+92[0-9]{10}$/;
const cnicPattern = /^[0-9]{5}-[0-9]{7}-[0-9]{1}$/;
const otpResendSeconds = 60;

const initialState: SignupFormState = {
  fullName: "",
  fatherName: "",
  cnic: "",
  email: "",
  password: "",
  confirmPassword: "",
  dateOfBirth: "",
  gender: "MALE",
  phone: "+92"
};

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

function normalizeCnicInput(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 13);
  const p1 = digits.slice(0, 5);
  const p2 = digits.slice(5, 12);
  const p3 = digits.slice(12, 13);

  if (digits.length <= 5) return p1;
  if (digits.length <= 12) return `${p1}-${p2}`;
  return `${p1}-${p2}-${p3}`;
}

function isLessThan18(dateOfBirth: string) {
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) {
    return false;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return age < 18;
}

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) return { label: "Weak", value: 34 };
  if (score <= 4) return { label: "Medium", value: 67 };
  return { label: "Strong", value: 100 };
}

export function SignupCard() {
  const router = useRouter();
  const [form, setForm] = useState<SignupFormState>(initialState);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [otp, setOtp] = useState("");
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpResendIn, setOtpResendIn] = useState(0);
  const [loading, setLoading] = useState(false);

  const requestIdRef = useRef("");

  useEffect(() => {
    if (otpResendIn <= 0) return;
    const timer = window.setTimeout(() => {
      setOtpResendIn((prev) => prev - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [otpResendIn]);

  const strength = useMemo(() => getPasswordStrength(form.password), [form.password]);
  const phoneValid = phonePattern.test(form.phone.trim());
  const cnicValid = cnicPattern.test(form.cnic.trim());
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const passwordsMatch =
    form.password.length > 0 && form.password === form.confirmPassword;

  const completionScore = useMemo(() => {
    const checks = [
      form.fullName.trim().length > 0,
      form.fatherName.trim().length > 0,
      cnicValid,
      form.email.includes("@"),
      form.password.length >= 8,
      passwordsMatch,
      form.dateOfBirth.length > 0,
      form.gender.length > 0,
      phoneValid
    ];
    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [form, cnicValid, passwordsMatch, phoneValid]);

  function fieldClass(valid: boolean, touched: boolean) {
    if (!touched) return "input";
    return `input ${valid ? "inputSuccess validationPulseOk" : "inputError validationPulseError"}`;
  }

  function validateBeforeOtp() {
    if (!form.fullName.trim()) return "Full Name required hai.";
    if (!form.fatherName.trim()) return "Father Name required hai.";
    if (!cnicValid) return "CNIC format 00000-0000000-0 hona chahiye.";
    if (!form.email.includes("@")) return "Valid email enter karein.";
    if (form.password.length < 8) return "Password kam az kam 8 characters ho.";
    if (!passwordsMatch) return "Password aur confirm password match nahi kar rahe.";
    if (!form.dateOfBirth) return "Date of birth required hai.";
    if (isLessThan18(form.dateOfBirth)) {
      return "Age less than 18 ka account nahi ban sakta. Ask your mama papa to create account.";
    }
    if (!phoneValid) return "Phone format +923004203035 hona chahiye.";
    return "";
  }

  async function requestSignupOtp() {
    const response = await requestOtp(form.phone.trim(), { forSignup: true });
    requestIdRef.current = response.requestId;
    setOtpModalOpen(true);
    setOtpResendIn(otpResendSeconds);
  }

  async function onCreateAccount(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    const validationError = validateBeforeOtp();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await requestSignupOtp();
      setMessage("OTP send ho gaya. Popup me 6-digit code verify karein.");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(toUserFriendlyAuthError(err.message));
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
    setLoading(true);
    try {
      await requestSignupOtp();
      setMessage("Naya OTP send kar diya gaya.");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(toUserFriendlyAuthError(err.message));
      } else {
        setError("OTP resend failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyOtpAndCreate(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!requestIdRef.current) {
      setError("Pehle OTP request karein.");
      return;
    }
    if (otp.trim().length !== 6) {
      setError("6-digit OTP required hai.");
      return;
    }

    setLoading(true);
    try {
      const verification = await verifyOtp({
        requestId: requestIdRef.current,
        phone: form.phone.trim(),
        otp: otp.trim(),
        purpose: "SIGNUP"
      });

      await signup({
        fullName: form.fullName.trim(),
        fatherName: form.fatherName.trim(),
        cnic: form.cnic.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: form.phone.trim(),
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        otpVerificationToken: verification.verificationToken
      });

      requestIdRef.current = "";
      setOtpModalOpen(false);
      setMessage("Account create ho gaya aur login ho chuka hai.");
      router.push("/");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(toUserFriendlyAuthError(err.message));
      } else if (err instanceof Error) {
        setError(toUserFriendlyAuthError(err.message));
      } else {
        setError("OTP verify karke account create nahi ho saka.");
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
        <p className="authBrandTagline">Tera Dil Ka Saaman — Mere Ghar Ka Hissa</p>
      </div>
      <h2>Create Account</h2>
      <p className="helperText">Sirf Asli Log. Sirf Ghar Ka Saaman.</p>

      <form className="stack" onSubmit={onCreateAccount}>
        <input
          className={fieldClass(form.fullName.trim().length >= 3, form.fullName.length > 0)}
          placeholder="Full Name"
          value={form.fullName}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, fullName: event.target.value }))
          }
          autoComplete="name"
          required
        />
        <input
          className={fieldClass(form.fatherName.trim().length >= 3, form.fatherName.length > 0)}
          placeholder="Father Name"
          value={form.fatherName}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, fatherName: event.target.value }))
          }
          autoComplete="off"
          required
        />
        <input
          className={fieldClass(cnicValid, form.cnic.length > 0)}
          placeholder="CNIC (00000-0000000-0)"
          value={form.cnic}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, cnic: normalizeCnicInput(event.target.value) }))
          }
          autoComplete="off"
          required
        />
        {form.cnic.length > 0 ? (
          <div className={`microValidationHint ${cnicValid ? "ok" : "error"}`}>
            {cnicValid ? "CNIC format looks good." : "CNIC format 00000-0000000-0 hona chahiye."}
          </div>
        ) : null}
        <input
          className={fieldClass(emailValid, form.email.length > 0)}
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, email: event.target.value }))
          }
          autoComplete="email"
          required
        />
        {form.email.length > 0 ? (
          <div className={`microValidationHint ${emailValid ? "ok" : "error"}`}>
            {emailValid ? "Email verified for account creation." : "Valid email address enter karein."}
          </div>
        ) : null}
        <input
          className={fieldClass(form.password.length >= 8, form.password.length > 0)}
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, password: event.target.value }))
          }
          autoComplete="new-password"
          required
        />
        <div className="passwordStrength">
          <div className="passwordStrengthBar">
            <span style={{ width: `${strength.value}%` }} />
          </div>
          <small>{strength.label} password</small>
        </div>
        <input
          className={fieldClass(passwordsMatch, form.confirmPassword.length > 0)}
          type="password"
          placeholder="Confirm Password"
          value={form.confirmPassword}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
          }
          autoComplete="new-password"
          required
        />
        {form.confirmPassword.length > 0 ? (
          <div className={`microValidationHint ${passwordsMatch ? "ok" : "error"}`}>
            {passwordsMatch ? "Passwords match." : "Password aur confirm password same honay chahiye."}
          </div>
        ) : null}
        <input
          className={fieldClass(!isLessThan18(form.dateOfBirth), form.dateOfBirth.length > 0)}
          type="date"
          value={form.dateOfBirth}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, dateOfBirth: event.target.value }))
          }
          autoComplete="bday"
          required
        />
        <select
          className="input"
          value={form.gender}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              gender: event.target.value as SignupFormState["gender"]
            }))
          }
          required
        >
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
          <option value="OTHER">Other</option>
        </select>
        <input
          className={fieldClass(phoneValid, form.phone.length > 3)}
          placeholder="+923004203035"
          value={form.phone}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              phone: normalizePhoneInput(event.target.value)
            }))
          }
          autoComplete="tel"
          required
        />
        {form.phone.length > 3 ? (
          <div className={`microValidationHint ${phoneValid ? "ok" : "error"}`}>
            {phoneValid ? "Phone ready for OTP verification." : "Phone format +923004203035 hona chahiye."}
          </div>
        ) : null}
        <div className="helperText">Form completion: {completionScore}%</div>
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Please wait..." : "Create Account"}
        </button>
      </form>

      {otpModalOpen ? (
        <div className="modalBackdrop" role="dialog" aria-modal="true">
          <div className="modalCard">
            <h3>OTP Verification</h3>
            <p className="shareHint">
              6-digit OTP enter karein. OTP verify hote hi account create hoga.
            </p>
            <form className="stack" onSubmit={onVerifyOtpAndCreate}>
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
                  {loading ? "Verifying..." : "Verify OTP & Create"}
                </button>
              </div>
            </form>
            <button
              className="btn secondary"
              type="button"
              onClick={() => setOtpModalOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}
    </section>
  );
}


