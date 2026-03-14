const owner = process.env.EXPO_OWNER || 'farrukh3035';
const projectId = process.env.EXPO_EAS_PROJECT_ID || '8c9be2ab-853b-4c1a-b4f3-e49d269bbd02';
const version = process.env.EXPO_APP_VERSION || '1.0.0';
const versionCode = Number(process.env.EXPO_ANDROID_VERSION_CODE || '1');
const packageName = process.env.EXPO_ANDROID_PACKAGE || 'com.tgmg.app';
const environment = process.env.EXPO_PUBLIC_ENV || 'development';

export default {
  expo: {
    name: environment === 'production' ? 'TGMG' : `TGMG ${environment.toUpperCase()}`,
    slug: 'farrukh-farooq',
    scheme: 'tgmg',
    version,
    owner,
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    icon: './assets/icon.png',
    runtimeVersion: {
      policy: 'appVersion',
    },
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#FFF4F2',
    },
    updates: projectId
      ? {
          url: `https://u.expo.dev/${projectId}`,
        }
      : undefined,
    plugins: ['expo-router', 'expo-location', 'expo-notifications'],
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      environment,
      eas: projectId ? { projectId } : undefined,
    },
    android: {
      package: packageName,
      versionCode,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#E53935',
      },
      permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'POST_NOTIFICATIONS'],
    },
    platforms: ['android'],
  },
};
