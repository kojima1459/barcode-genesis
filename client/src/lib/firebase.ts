import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// Firebase Console から取得した正しい設定
const firebaseConfig = {
  apiKey: "AIzaSyBV5GUqsQTsHM9PxZbwnirS2FSUNV6k4z4",
  authDomain: "barcodegame-42858.firebaseapp.com",
  projectId: "barcodegame-42858",
  storageBucket: "barcodegame-42858.firebasestorage.app",
  messagingSenderId: "568442609396",
  appId: "1:568442609396:web:94efd24ef8a6f39c6708a1",
  measurementId: "G-Q69RL7BNFQ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
// Cloud Functions は us-central1 にデプロイされているため、リージョンを明示的に指定
export const functions = getFunctions(app, 'us-central1');
export const googleProvider = new GoogleAuthProvider();

if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === "1") {
  connectAuthEmulator(auth, "http://localhost:9099");
  connectFirestoreEmulator(db, "localhost", 8084);
  connectFunctionsEmulator(functions, "localhost", 5001);
}
