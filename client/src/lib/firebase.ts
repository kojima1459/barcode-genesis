/**
 * Firebase Configuration - Centralized
 * 
 * All Firebase services are initialized here and exported.
 * Services are loaded dynamically on first access to reduce initial bundle.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth as getFirebaseAuth, GoogleAuthProvider, connectAuthEmulator, type Auth } from "firebase/auth";
import { getFirestore as getFirebaseFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { getStorage as getFirebaseStorage, connectStorageEmulator, type FirebaseStorage } from "firebase/storage";
import { getFunctions as getFirebaseFunctions, connectFunctionsEmulator, type Functions } from "firebase/functions";
import { getMessaging as getFirebaseMessaging, type Messaging } from "firebase/messaging";

// Firebase Console configuration
const firebaseConfig = {
  apiKey: "AIzaSyBV5GUqsQTsHM9PxZbwnirS2FSUNV6k4z4",
  authDomain: "barcodegame-42858.firebaseapp.com",
  projectId: "barcodegame-42858",
  storageBucket: "barcodegame-42858.firebasestorage.app",
  messagingSenderId: "568442609396",
  appId: "1:568442609396:web:94efd24ef8a6f39c6708a1",
  measurementId: "G-Q69RL7BNFQ"
};

// Singleton instances
let app: FirebaseApp;
let authInstance: Auth;
let dbInstance: Firestore;
let functionsInstance: Functions;
let storageInstance: FirebaseStorage;
let messagingInstance: Messaging;
let emulatorConnected = false;

// Initialize app only once
function getAppInstance(): FirebaseApp {
  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

// Connect to emulators once
function connectEmulators() {
  if (emulatorConnected) return;
  if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === "1") {
    if (authInstance) connectAuthEmulator(authInstance, "http://localhost:9099");
    if (dbInstance) connectFirestoreEmulator(dbInstance, "localhost", 8084);
    if (functionsInstance) connectFunctionsEmulator(functionsInstance, "localhost", 5001);
    if (storageInstance) connectStorageEmulator(storageInstance, "localhost", 9199);
    emulatorConnected = true;
  }
}

// Lazy getters - services are only created when first accessed
export const auth = new Proxy({} as Auth, {
  get(_, prop) {
    if (!authInstance) {
      authInstance = getFirebaseAuth(getAppInstance());
      connectEmulators();
    }
    return (authInstance as any)[prop];
  }
});

export const db = new Proxy({} as Firestore, {
  get(_, prop) {
    if (!dbInstance) {
      dbInstance = getFirebaseFirestore(getAppInstance());
      connectEmulators();
    }
    return (dbInstance as any)[prop];
  }
});

export const functions = new Proxy({} as Functions, {
  get(_, prop) {
    if (!functionsInstance) {
      functionsInstance = getFirebaseFunctions(getAppInstance(), 'us-central1');
      connectEmulators();
    }
    return (functionsInstance as any)[prop];
  }
});

export const storage = new Proxy({} as FirebaseStorage, {
  get(_, prop) {
    if (!storageInstance) {
      storageInstance = getFirebaseStorage(getAppInstance());
      connectEmulators();
    }
    return (storageInstance as any)[prop];
  }
});

export const googleProvider = new GoogleAuthProvider();

// For direct access when proxy doesn't work
export function getAuth(): Auth {
  if (!authInstance) {
    authInstance = getFirebaseAuth(getAppInstance());
    connectEmulators();
  }
  return authInstance;
}

export function getDb(): Firestore {
  if (!dbInstance) {
    dbInstance = getFirebaseFirestore(getAppInstance());
    connectEmulators();
  }
  return dbInstance;
}

export function getFunctions(): Functions {
  if (!functionsInstance) {
    functionsInstance = getFirebaseFunctions(getAppInstance(), 'us-central1');
    connectEmulators();
  }
  return functionsInstance;
}

export function getStorage(): FirebaseStorage {
  if (!storageInstance) {
    storageInstance = getFirebaseStorage(getAppInstance());
    connectEmulators();
  }
  return storageInstance;
}

// Messaging - lazy loaded (only works in supported browsers)
export const messaging = new Proxy({} as Messaging, {
  get(_, prop) {
    if (!messagingInstance) {
      try {
        messagingInstance = getFirebaseMessaging(getAppInstance());
      } catch (e) {
        console.warn("Firebase Messaging not supported in this browser");
        return undefined;
      }
    }
    return (messagingInstance as any)[prop];
  }
});

export function getMessaging(): Messaging | null {
  if (!messagingInstance) {
    try {
      messagingInstance = getFirebaseMessaging(getAppInstance());
    } catch (e) {
      console.warn("Firebase Messaging not supported in this browser");
      return null;
    }
  }
  return messagingInstance;
}
