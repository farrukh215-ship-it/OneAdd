export function toUserFriendlyAuthError(input: unknown) {
  const raw = String(input ?? "").trim();
  const message = raw.toLowerCase();

  if (!raw) {
    return "Kuch ghalat ho gaya. Dobara try karein.";
  }

  if (
    message.includes("firebase auth is not configured") ||
    message.includes("firebase configuration is missing") ||
    message.includes("firebase config missing") ||
    message.includes("firebase_service_account_path") ||
    message.includes("fcm_")
  ) {
    return "Phone verification abhi available nahi hai. Email aur password se login karein ya thori dair baad dobara try karein.";
  }

  if (message.includes("recaptcha")) {
    return "Verification load nahi ho saki. Page refresh karke dobara try karein.";
  }

  if (message.includes("invalid credentials")) {
    return "Email ya password sahi nahi hai.";
  }

  if (message.includes("request failed: 502") || message.includes("bad gateway")) {
    return "Server se connection mein masla aa gaya hai. Thori dair baad dobara try karein.";
  }

  if (message.includes("request failed: 500")) {
    return "Server temporary maslay ka shikar hai. Thori dair baad dobara try karein.";
  }

  if (message.includes("request failed: 404")) {
    return "Required service is waqt available nahi hai. Thori dair baad dobara try karein.";
  }

  if (message.includes("networkerror") || message.includes("failed to fetch")) {
    return "Internet ya server connection ka masla hai. Dobara try karein.";
  }

  if (message.includes("invalid firebase idtoken")) {
    return "Phone verification complete nahi ho saki. Dobara try karein.";
  }

  if (message.includes("phone verification failed")) {
    return "Phone verification match nahi hui. Dobara OTP verify karein.";
  }

  if (message.includes("otp request failed")) {
    return "OTP bhejna possible nahi hua. Dobara try karein.";
  }

  if (
    message.includes("otp delivery service") ||
    message.includes("configured nahi hai") ||
    message.includes("sms configuration missing") ||
    message.includes("sms4connect configuration is missing")
  ) {
    return "OTP service abhi active nahi hai. Support se rabta karein ya thori dair baad dobara try karein.";
  }

  if (
    message.includes("otp send nahi ho saka") ||
    message.includes("failed to send otp sms") ||
    message.includes("sms service response invalid")
  ) {
    return "OTP receive nahi ho saka. SMS service me masla hai, thori dair baad dobara try karein.";
  }

  if (message.includes("otp resend failed")) {
    return "Naya OTP bhejna possible nahi hua. Dobara try karein.";
  }

  if (message.includes("otp verification failed")) {
    return "OTP verify nahi ho saki. Code dobara check karein.";
  }

  return raw;
}
