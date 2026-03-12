import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??
    'AIzaSyCayPii-w6RumZ8Qjgs4NznNSQ4HatH3bs',
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    'aikad-13dc4.firebaseapp.com',
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    'aikad-13dc4',
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    'aikad-13dc4.firebasestorage.app',
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??
    '201729412856',
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??
    '1:201729412856:web:f2400591798aa5454c350d',
};

export function getFirebaseAuth() {
  const required = [
    firebaseConfig.apiKey,
    firebaseConfig.authDomain,
    firebaseConfig.projectId,
    firebaseConfig.appId,
  ];

  if (required.some((value) => !value)) return null;

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getAuth(app);
}
