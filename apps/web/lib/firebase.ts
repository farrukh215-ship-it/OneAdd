import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? undefined
};

function hasFirebaseConfig() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId
  );
}

function getFirebaseApp(): FirebaseApp {
  if (!hasFirebaseConfig()) {
    throw new Error(
      "Firebase config missing. Set NEXT_PUBLIC_FIREBASE_* in apps/web/.env.local."
    );
  }

  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function isFirebaseConfigured() {
  return hasFirebaseConfig();
}
