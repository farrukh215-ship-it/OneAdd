import Constants from 'expo-constants';

export const PRODUCTION_API_URL = 'https://teragharmeraghar.com/api';

export function getMobileEnvironment() {
  return Constants.expoConfig?.extra?.environment || process.env.EXPO_PUBLIC_ENV || 'development';
}

export function getMobileApiUrl() {
  const configured = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL;
  if (configured) return configured;
  if (getMobileEnvironment() === 'production') return PRODUCTION_API_URL;
  return 'http://localhost:3001';
}
