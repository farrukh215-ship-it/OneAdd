'use client';

import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('tgmg_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined' && error.response?.status === 401) {
      const redirectTo = window.location.pathname + window.location.search;
      window.localStorage.removeItem('tgmg_token');
      window.location.href = `/auth?next=${encodeURIComponent(redirectTo)}`;
    }

    return Promise.reject(error);
  },
);
