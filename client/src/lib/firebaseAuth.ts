import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth as getFirebaseAuth, GoogleAuthProvider, connectAuthEmulator, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBV5GUqsQTsHM9PxZbwnirS2FSUNV6k4z4",
  authDomain: "barcodegame-42858.firebaseapp.com",
  projectId: "barcodegame-42858",
  storageBucket: "barcodegame-42858.firebasestorage.app",
  messagingSenderId: "568442609396",
  appId: "1:568442609396:web:94efd24ef8a6f39c6708a1",
  measurementId: "G-Q69RL7BNFQ"
};

let app: FirebaseApp;
let authInstance: Auth;
let emulatorConnected = false;

function getAppInstance(): FirebaseApp {
  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

function connectEmulators() {
  if (emulatorConnected) return;
  if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === "1") {
    if (authInstance) connectAuthEmulator(authInstance, "http://localhost:9099");
    emulatorConnected = true;
  }
}

export const googleProvider = new GoogleAuthProvider();

export function getAuth(): Auth {
  if (!authInstance) {
    authInstance = getFirebaseAuth(getAppInstance());
    connectEmulators();
  }
  return authInstance;
}
