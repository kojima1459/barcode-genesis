import { createContext, useContext, useEffect, useRef, useState } from "react";
import { User, onAuthStateChanged, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getAuth, googleProvider } from "@/lib/firebaseAuth";

// Auth状態: loading → authed or guest
export type AuthStatus = 'loading' | 'authed' | 'guest';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authStatus: AuthStatus;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const mountedRef = useRef(true);

  useEffect(() => {
    console.log("[AuthContext] Setting up onAuthStateChanged listener...");
    mountedRef.current = true;
    const unsubscribe = onAuthStateChanged(getAuth(), (firebaseUser) => {
      console.log("[AuthContext] onAuthStateChanged fired:", firebaseUser ? `User authenticated - ${firebaseUser.email}` : "No user authenticated");
      if (!mountedRef.current) return;
      if (firebaseUser) {
        setUser(firebaseUser);
        setAuthStatus('authed');
      } else {
        setUser(null);
        setAuthStatus('guest');
      }
    });

    return () => {
      console.log("[AuthContext] Cleaning up listener");
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      const authInstance = getAuth();
      await signInWithPopup(authInstance, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    const authInstance = getAuth();
    await signInWithEmailAndPassword(authInstance, email, pass);
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    const authInstance = getAuth();
    await createUserWithEmailAndPassword(authInstance, email, pass);
  };

  const logout = async () => {
    try {
      const authInstance = getAuth();
      await signOut(authInstance);
    } catch (error) {
      console.error("Error signing out", error);
      throw error;
    }
  };

  // loading = authStatus === 'loading' for backward compat
  const loading = authStatus === 'loading';

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      authStatus,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
