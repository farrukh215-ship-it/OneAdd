export const FEATURE_FLAG_KEYS = [
  "AUTO_HIDE_REPORTS",
  "VIDEO_FEED",
  "SHADOW_BAN",
  "OTP_REQUIRED"
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];
