/**
 * Firebase Lazy Loading Module
 * 
 * This module provides lazy-loaded Firebase services to reduce initial bundle size.
 * Firebase SDK (~353KB) is only loaded when actually needed, not on initial page load.
 * 
 * Usage:
 *   const { auth, db, functions } = await getFirebaseServices();
 * 
 * Or for individual services:
 *   const auth = await getAuth();
 *   const db = await getFirestore();
 */

import type { Auth, GoogleAuthProvider as GoogleAuthProviderType } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { Functions } from 'firebase/functions';
import type { FirebaseStorage } from 'firebase/storage';
import type { FirebaseApp } from 'firebase/app';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBV5GUqsQTsHM9PxZbwnirS2FSUNV6k4z4",
    authDomain: "barcodegame-42858.firebaseapp.com",
    projectId: "barcodegame-42858",
    storageBucket: "barcodegame-42858.firebasestorage.app",
    messagingSenderId: "568442609396",
    appId: "1:568442609396:web:94efd24ef8a6f39c6708a1",
    measurementId: "G-Q69RL7BNFQ"
};

// Cached instances (singleton pattern)
let firebaseApp: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let functionsInstance: Functions | null = null;
let storageInstance: FirebaseStorage | null = null;
let googleProviderInstance: GoogleAuthProviderType | null = null;

// Initialization flag to prevent multiple initializations
let isInitializing = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize Firebase app (lazy, singleton)
 */
async function initializeFirebaseApp(): Promise<FirebaseApp> {
    if (firebaseApp) return firebaseApp;

    const { initializeApp } = await import('firebase/app');
    firebaseApp = initializeApp(firebaseConfig);
    return firebaseApp;
}

/**
 * Get Firebase Auth instance (lazy loaded)
 */
export async function getAuth(): Promise<Auth> {
    if (authInstance) return authInstance;

    const app = await initializeFirebaseApp();
    const { getAuth: getFirebaseAuth, connectAuthEmulator } = await import('firebase/auth');
    authInstance = getFirebaseAuth(app);

    // Connect to emulator in development
    if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === "1") {
        connectAuthEmulator(authInstance, "http://localhost:9099");
    }

    return authInstance;
}

/**
 * Get Google Auth Provider (lazy loaded)
 */
export async function getGoogleProvider(): Promise<GoogleAuthProviderType> {
    if (googleProviderInstance) return googleProviderInstance;

    const { GoogleAuthProvider } = await import('firebase/auth');
    googleProviderInstance = new GoogleAuthProvider();
    return googleProviderInstance;
}

/**
 * Get Firestore instance (lazy loaded)
 */
export async function getFirestore(): Promise<Firestore> {
    if (dbInstance) return dbInstance;

    const app = await initializeFirebaseApp();
    const { getFirestore: getFirebaseFirestore, connectFirestoreEmulator } = await import('firebase/firestore');
    dbInstance = getFirebaseFirestore(app);

    // Connect to emulator in development
    if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === "1") {
        connectFirestoreEmulator(dbInstance, "localhost", 8084);
    }

    return dbInstance;
}

/**
 * Get Firebase Functions instance (lazy loaded)
 */
export async function getFunctions(): Promise<Functions> {
    if (functionsInstance) return functionsInstance;

    const app = await initializeFirebaseApp();
    const { getFunctions: getFirebaseFunctions, connectFunctionsEmulator } = await import('firebase/functions');
    functionsInstance = getFirebaseFunctions(app, 'us-central1');

    // Connect to emulator in development
    if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === "1") {
        connectFunctionsEmulator(functionsInstance, "localhost", 5001);
    }

    return functionsInstance;
}

/**
 * Get Firebase Storage instance (lazy loaded)
 */
export async function getStorage(): Promise<FirebaseStorage> {
    if (storageInstance) return storageInstance;

    const app = await initializeFirebaseApp();
    const { getStorage: getFirebaseStorage, connectStorageEmulator } = await import('firebase/storage');
    storageInstance = getFirebaseStorage(app);

    // Connect to emulator in development
    if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === "1") {
        connectStorageEmulator(storageInstance, "localhost", 9199);
    }

    return storageInstance;
}

/**
 * Get all Firebase services at once (for components that need multiple services)
 */
export async function getFirebaseServices() {
    const [auth, db, functions, storage, googleProvider] = await Promise.all([
        getAuth(),
        getFirestore(),
        getFunctions(),
        getStorage(),
        getGoogleProvider(),
    ]);

    return { auth, db, functions, storage, googleProvider };
}

/**
 * Pre-warm Firebase (call this after first user interaction or idle time)
 * This loads Firebase in the background without blocking initial render
 */
export function preloadFirebase(): void {
    if (typeof window === 'undefined') return;

    // Use requestIdleCallback if available, otherwise setTimeout
    const schedulePreload = (callback: () => void) => {
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(callback, { timeout: 5000 });
        } else {
            setTimeout(callback, 1000);
        }
    };

    schedulePreload(() => {
        // Just importing the app will cache it for later use
        initializeFirebaseApp().catch(console.error);
    });
}
