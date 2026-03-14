export default {
  expo: {
    name: 'TGMG',
    slug: 'tgmg',
    scheme: 'tgmg',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#FFF4F2',
    },
    extra: { apiUrl: process.env.EXPO_PUBLIC_API_URL },
    android: {
      package: 'com.tgmg.app',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#E53935',
      },
      permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
    },
    platforms: ['android'],
  },
};
