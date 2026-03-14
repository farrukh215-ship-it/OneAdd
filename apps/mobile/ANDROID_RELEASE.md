# Android Release Pipeline

This app is configured for Expo EAS Android builds with release-safe defaults.

## Required environment

Set these before running EAS:

```bash
EXPO_PUBLIC_API_URL=https://your-api.example.com
EXPO_OWNER=your-expo-owner
EXPO_EAS_PROJECT_ID=your-eas-project-id
EXPO_ANDROID_PACKAGE=com.tgmg.app
EXPO_ANDROID_VERSION_CODE=1
EXPO_APP_VERSION=1.0.0
```

## One-time setup

```bash
pnpm mobile:eas:init
pnpm mobile:eas:configure
pnpm mobile:eas:credentials
```

Notes:
- Let EAS manage the Android keystore unless you already have a production keystore.
- Play Store service account JSON is required for `eas submit`; do not commit it.

## Build profiles

- `preview`: internal APK for QA/testing
- `production`: Android App Bundle for Play Store upload

## Commands

```bash
pnpm mobile:eas:preview
pnpm mobile:eas:production
pnpm mobile:eas:submit
```

## Store submission checklist

1. Confirm `EXPO_PUBLIC_API_URL` points to production API.
2. Increment `EXPO_ANDROID_VERSION_CODE`.
3. Increment `EXPO_APP_VERSION`.
4. Run `pnpm --filter @tgmg/mobile build` for a local sanity check.
5. Build production AAB with EAS.
6. Submit to Play internal track first.

