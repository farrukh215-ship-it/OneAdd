const DISABLED_FLAG_VALUES = new Set(["0", "false", "off", "no"]);

export function isPremiumUiEnabled() {
  const raw = process.env.NEXT_PUBLIC_UI_PREMIUM_V1?.trim().toLowerCase();
  if (!raw) {
    return true;
  }
  return !DISABLED_FLAG_VALUES.has(raw);
}

