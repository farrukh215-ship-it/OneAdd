import { router } from 'expo-router';
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { storage } from './storage';
import { captureApiFailure } from './telemetry';
import { getMobileApiUrl } from './runtime-config';

export const api = axios.create({
  baseURL: getMobileApiUrl(),
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

    if (!String(error.config?.url || '').includes('/telemetry/mobile')) {
      void captureApiFailure({
        method: error.config?.method?.toUpperCase(),
        url: error.config?.url,
        status: error.response?.status,
        message: error.message,
      });
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
