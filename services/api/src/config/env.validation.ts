type EnvConfig = {
  NODE_ENV?: string;
  PORT?: string;
  CORS_ORIGIN?: string;
  DATABASE_URL?: string;
  JWT_ACCESS_SECRET?: string;
  JWT_ACCESS_EXPIRES_IN?: string;
  OTP_SECRET?: string;
  OTP_EXPIRES_MINUTES?: string;
  OTP_MAX_ATTEMPTS?: string;
  OTP_MAX_REQUESTS_PER_WINDOW?: string;
  OTP_REQUEST_WINDOW_MINUTES?: string;
  SMS_PROVIDER?: string;
  SMS4CONNECT_BASE_URL?: string;
  SMS4CONNECT_API_KEY?: string;
  SMS4CONNECT_SENDER_ID?: string;
  REDIS_URL?: string;
  ADMIN_EMAILS?: string;
  AUTO_HIDE_REPORTS_THRESHOLD?: string;
  RATE_LIMIT_MAX?: string;
  RATE_LIMIT_WINDOW_SECONDS?: string;
  MEDIA_SIGNING_SECRET?: string;
  MEDIA_SIGNING_EXPIRES_SECONDS?: string;
  MEDIA_PUBLIC_BASE_URL?: string;
};

export function validateEnvironment(config: EnvConfig) {
  const nodeEnv = config.NODE_ENV ?? "development";
  const port = Number(config.PORT ?? 3001);
  const otpExpiresMinutes = Number(config.OTP_EXPIRES_MINUTES ?? 3);
  const otpMaxAttempts = Number(config.OTP_MAX_ATTEMPTS ?? 5);
  const otpMaxRequestsPerWindow = Number(config.OTP_MAX_REQUESTS_PER_WINDOW ?? 3);
  const otpRequestWindowMinutes = Number(config.OTP_REQUEST_WINDOW_MINUTES ?? 3);
  const autoHideReportsThreshold = Number(config.AUTO_HIDE_REPORTS_THRESHOLD ?? 5);
  const rateLimitMax = Number(config.RATE_LIMIT_MAX ?? 100);
  const rateLimitWindowSeconds = Number(config.RATE_LIMIT_WINDOW_SECONDS ?? 60);
  const mediaSigningExpiresSeconds = Number(
    config.MEDIA_SIGNING_EXPIRES_SECONDS ?? 600
  );

  if (Number.isNaN(port) || port <= 0) {
    throw new Error("PORT must be a valid positive number.");
  }
  if (!["development", "test", "production"].includes(nodeEnv)) {
    throw new Error("NODE_ENV must be one of: development, test, production.");
  }
  if (nodeEnv !== "development" && !config.CORS_ORIGIN) {
    throw new Error("CORS_ORIGIN is required outside development.");
  }
  if (!config.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }
  if (!config.JWT_ACCESS_SECRET) {
    throw new Error("JWT_ACCESS_SECRET is required.");
  }
  if (!config.OTP_SECRET) {
    throw new Error("OTP_SECRET is required.");
  }
  if (Number.isNaN(otpExpiresMinutes) || otpExpiresMinutes <= 0) {
    throw new Error("OTP_EXPIRES_MINUTES must be a positive number.");
  }
  if (Number.isNaN(otpMaxAttempts) || otpMaxAttempts <= 0) {
    throw new Error("OTP_MAX_ATTEMPTS must be a positive number.");
  }
  if (Number.isNaN(otpMaxRequestsPerWindow) || otpMaxRequestsPerWindow <= 0) {
    throw new Error("OTP_MAX_REQUESTS_PER_WINDOW must be a positive number.");
  }
  if (Number.isNaN(otpRequestWindowMinutes) || otpRequestWindowMinutes <= 0) {
    throw new Error("OTP_REQUEST_WINDOW_MINUTES must be a positive number.");
  }
  if (
    Number.isNaN(autoHideReportsThreshold) ||
    autoHideReportsThreshold <= 0
  ) {
    throw new Error("AUTO_HIDE_REPORTS_THRESHOLD must be a positive number.");
  }
  if (Number.isNaN(rateLimitMax) || rateLimitMax <= 0) {
    throw new Error("RATE_LIMIT_MAX must be a positive number.");
  }
  if (Number.isNaN(rateLimitWindowSeconds) || rateLimitWindowSeconds <= 0) {
    throw new Error("RATE_LIMIT_WINDOW_SECONDS must be a positive number.");
  }
  if (!config.MEDIA_SIGNING_SECRET) {
    throw new Error("MEDIA_SIGNING_SECRET is required.");
  }
  if (
    Number.isNaN(mediaSigningExpiresSeconds) ||
    mediaSigningExpiresSeconds <= 0
  ) {
    throw new Error("MEDIA_SIGNING_EXPIRES_SECONDS must be a positive number.");
  }

  return {
    NODE_ENV: nodeEnv,
    PORT: port,
    CORS_ORIGIN:
      config.CORS_ORIGIN ?? "http://localhost:3000,http://localhost:3002",
    DATABASE_URL: config.DATABASE_URL,
    JWT_ACCESS_SECRET: config.JWT_ACCESS_SECRET,
    JWT_ACCESS_EXPIRES_IN: config.JWT_ACCESS_EXPIRES_IN ?? "7d",
    OTP_SECRET: config.OTP_SECRET,
    OTP_EXPIRES_MINUTES: otpExpiresMinutes,
    OTP_MAX_ATTEMPTS: otpMaxAttempts,
    OTP_MAX_REQUESTS_PER_WINDOW: otpMaxRequestsPerWindow,
    OTP_REQUEST_WINDOW_MINUTES: otpRequestWindowMinutes,
    SMS_PROVIDER: config.SMS_PROVIDER ?? "noop",
    SMS4CONNECT_BASE_URL: config.SMS4CONNECT_BASE_URL ?? "https://api.sms4connect.com",
    SMS4CONNECT_API_KEY: config.SMS4CONNECT_API_KEY ?? "",
    SMS4CONNECT_SENDER_ID: config.SMS4CONNECT_SENDER_ID ?? "",
    REDIS_URL: config.REDIS_URL ?? "redis://127.0.0.1:6379",
    ADMIN_EMAILS: config.ADMIN_EMAILS ?? "",
    AUTO_HIDE_REPORTS_THRESHOLD: autoHideReportsThreshold,
    RATE_LIMIT_MAX: rateLimitMax,
    RATE_LIMIT_WINDOW_SECONDS: rateLimitWindowSeconds,
    MEDIA_SIGNING_SECRET: config.MEDIA_SIGNING_SECRET,
    MEDIA_SIGNING_EXPIRES_SECONDS: mediaSigningExpiresSeconds,
    MEDIA_PUBLIC_BASE_URL: config.MEDIA_PUBLIC_BASE_URL ?? "https://cdn.example.com"
  };
}
