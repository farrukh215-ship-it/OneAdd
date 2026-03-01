import Constants from "expo-constants";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const extra = (Constants.expoConfig?.extra ?? {}) as {
  firebaseApiKey?: string;
  firebaseProjectId?: string;
  firebaseAuthDomain?: string;
  firebaseAppId?: string;
};

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? extra.firebaseApiKey,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? extra.firebaseProjectId,
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? extra.firebaseAuthDomain,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? extra.firebaseAppId
};

const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firebaseAppForRecaptcha = firebaseApp;
