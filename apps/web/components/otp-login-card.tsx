"use client";

import { FormEvent, useState } from "react";
import { loginWithOtp, requestOtp, verifyOtp } from "../lib/api";

export function OtpLoginCard() {
  const [phone, setPhone] = useState("");
  const [requestId, setRequestId] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function onRequestOtp(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const result = await requestOtp(phone.trim());
      setRequestId(result.requestId);
      setMessage("OTP sent. Please verify.");
    } catch {
      setError("Failed to request OTP.");
    }
  }

  async function onVerify(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const verify = await verifyOtp({
        requestId,
        phone: phone.trim(),
        otp: otp.trim()
      });

      await loginWithOtp({
        identifier: phone.trim(),
        otpVerificationToken: verify.verificationToken
      });
      setMessage("Login successful.");
      window.location.reload();
    } catch {
      setError("OTP verification failed.");
    }
  }

  return (
    <section className="panel authPanel">
      <h1>OTP Login</h1>
      <form className="stack" onSubmit={onRequestOtp}>
        <input
          className="input"
          placeholder="+923001234567"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
        <button className="btn" type="submit">
          Request OTP
        </button>
      </form>

      <form className="stack" onSubmit={onVerify}>
        <input
          className="input"
          placeholder="Request ID"
          value={requestId}
          onChange={(event) => setRequestId(event.target.value)}
        />
        <input
          className="input"
          placeholder="6-digit OTP"
          value={otp}
          onChange={(event) => setOtp(event.target.value)}
        />
        <button className="btn" type="submit">
          Verify & Login
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}
    </section>
  );
}
