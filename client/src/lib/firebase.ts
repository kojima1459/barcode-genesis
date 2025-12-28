import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// 環境変数から設定を読み込む
// 注意: 実際の開発では .env ファイルを使用しますが、
// ここではデモ用にハードコードするか、ユーザーに設定を求めます。
// 今回はプロジェクトIDがわかっているので、最低限の設定を行います。
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: "barcodegame-42858.firebaseapp.com",
  projectId: "barcodegame-42858",
  storageBucket: "barcodegame-42858.appspot.com",
  messagingSenderId: "563584335869",
  appId: "1:563584335869:web:demo-app-id"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const googleProvider = new GoogleAuthProvider();

if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === "1") {
  connectAuthEmulator(auth, "http://localhost:9099");
  connectFirestoreEmulator(db, "localhost", 8084);
  connectFunctionsEmulator(functions, "localhost", 5001);
}
