import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
} from 'firebase/firestore';
import { getAuth, signInAnonymously, Auth } from 'firebase/auth';
import firebaseConfigData from '../../firebase-applet-config.json';

export interface FirebaseAppletConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

export const firebaseConfig: FirebaseAppletConfig = firebaseConfigData as FirebaseAppletConfig;

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth: Auth = getAuth(app);

// Sign in anonymously to authenticate with Firebase if needed
signInAnonymously(auth).catch((err) => {
  // Silent fail or offline fallback
  console.info('Firebase auth initialization:', err.message);
});

// Initialize Firestore with custom database ID and offline multi-tab persistence
let firestoreInstance: Firestore;
try {
  const databaseId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? firebaseConfig.firestoreDatabaseId
    : undefined;

  const cacheConfig = {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  };

  firestoreInstance = databaseId
    ? initializeFirestore(app, cacheConfig, databaseId)
    : initializeFirestore(app, cacheConfig);
} catch (e) {
  // If already initialized, fallback to getFirestore
  const databaseId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? firebaseConfig.firestoreDatabaseId
    : undefined;
  firestoreInstance = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
}

export const db: Firestore = firestoreInstance;
