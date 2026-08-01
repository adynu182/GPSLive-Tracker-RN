import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// ─── Firebase config — set these in your .env file ──────────────
// EXPO_PUBLIC_FIREBASE_* vars are inlined at build time by Expo.
const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY            || '',
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN        || '',
  databaseURL:       process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL       || '',
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID         || '',
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET     || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID             || '',
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.warn(
    'Firebase config incomplete. Set EXPO_PUBLIC_FIREBASE_* in your .env file.'
  );
}

// ─── Prevent duplicate app init on hot-reload ────────────────────
const app = getApps().length === 0
  ? (firebaseConfig.apiKey ? initializeApp(firebaseConfig) : null)
  : getApps()[0];

export const db = app ? getDatabase(app) : null;
export { firebaseConfig, app };
