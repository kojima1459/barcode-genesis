import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";

export interface UserData {
    credits: number;
    scanTokens: number;
    xp: number;
    level: number;
    isPremium: boolean;
    loginStreak: number;
    displayName?: string;
    photoURL?: string;
    wins: number;
    battles: number;
    workshopLines: number;
    createdAt?: any;
    lastLogin?: any;
    // Arrays
    badgeIds?: string[];
    titleId?: string;
    lastFreeVariantDate?: string;
    variantCount?: number;
}

interface UserDataResult {
    userData: UserData | null;
    loading: boolean;
    error: Error | null;
    // Convenience accessors
    credits: number;
    scanTokens: number;
    loginStreak: number;
    lastFreeVariantDate: string | null;
    variantCount: number;
    workshopLines: number;
    isPremium: boolean;
    titleId: string | null;
    badgeIds: string[];
}

const UserDataContext = createContext<UserDataResult>({
    userData: null,
    loading: true,
    error: null,
    credits: 0,
    scanTokens: 0,
    loginStreak: 0,
    lastFreeVariantDate: null,
    variantCount: 0,
    workshopLines: 1,
    isPremium: false,
    titleId: null,
    badgeIds: [],
});

export function UserDataProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!user) {
            setUserData(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        const ref = doc(db, "users", user.uid);

        const unsub = onSnapshot(
            ref,
            (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    // Normalize data to ensure types
                    setUserData({
                        credits: typeof data.credits === "number" ? data.credits : 0,
                        scanTokens: typeof data.scanTokens === "number" ? data.scanTokens : 0,
                        xp: typeof data.xp === "number" ? data.xp : 0,
                        level: typeof data.level === "number" ? data.level : 1,
                        isPremium: !!data.isPremium,
                        loginStreak: typeof data.loginStreak === "number" ? data.loginStreak : 0,
                        displayName: data.displayName,
                        photoURL: data.photoURL,
                        wins: typeof data.wins === "number" ? data.wins : 0,
                        battles: typeof data.battles === "number" ? data.battles : 0,
                        workshopLines: typeof data.workshopLines === "number" ? data.workshopLines : 1,
                        createdAt: data.createdAt,
                        lastLogin: data.lastLogin,
                        badgeIds: Array.isArray(data.badgeIds) ? data.badgeIds : [],
                        titleId: typeof data.titleId === "string" ? data.titleId : undefined,
                        lastFreeVariantDate: typeof data.lastFreeVariantDate === "string" ? data.lastFreeVariantDate : undefined,
                        variantCount: typeof data.variantCount === "number" ? data.variantCount : 0,
                    });
                } else {
                    // User document doesn't exist yet (might be creating)
                    setUserData(null);
                }
                setLoading(false);
            },
            (err) => {
                console.error("useUserData error:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsub();
    }, [user]);

    const value: UserDataResult = {
        userData,
        loading,
        error,
        credits: userData?.credits ?? 0,
        scanTokens: userData?.scanTokens ?? 0,
        loginStreak: userData?.loginStreak ?? 0,
        lastFreeVariantDate: userData?.lastFreeVariantDate ?? null,
        variantCount: userData?.variantCount ?? 0,
        workshopLines: userData?.workshopLines ?? 1,
        isPremium: !!userData?.isPremium,
        titleId: userData?.titleId ?? null,
        badgeIds: userData?.badgeIds ?? [],
    };

    return (
        <UserDataContext.Provider value={value}>
            {children}
        </UserDataContext.Provider>
    );
}

export function useUserData() {
    return useContext(UserDataContext);
}
