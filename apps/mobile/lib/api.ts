import Constants from 'expo-constants';
import { router } from 'expo-router';
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { storage } from './storage';

const apiUrl =
  Constants.expoConfig?.extra?.apiUrl ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:3001';

export const api = axios.create({
  baseURL: apiUrl,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = storage.getString('tgmg_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      storage.remove('tgmg_token');
      router.replace('/auth/phone');
    }

    return Promise.reject(error);
  },
);

export const listingKeys = {
  all: ['listings'] as const,
  list: (filters: unknown) => ['listings', 'list', filters] as const,
  detail: (id: string) => ['listings', 'detail', id] as const,
};

export const categoryKeys = {
  all: ['categories'] as const,
};
