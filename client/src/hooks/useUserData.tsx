import { useState, useEffect, useRef, createContext, useContext, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { Unsubscribe } from "firebase/firestore";

export interface UserData {
    credits: number;
    scanTokens: number;
    xp: number;
    level: number;
    isPremium: boolean;
    loginStreak: number;
    displayName?: string;
    photoURL?: string;
    photoURLUpdatedAt?: number; // Timestamp for cache busting
    wins: number;
    battles: number;
    workshopLines: number;
    createdAt?: any;
    lastLogin?: any;
    activeUnitId?: string;
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
    activeUnitId: string | null;
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
    activeUnitId: null,
});

export function UserDataProvider({ children }: { children: ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        if (authLoading) {
            if (!mountedRef.current) return;
            setLoading(true);
            return;
        }
        if (!user) {
            if (!mountedRef.current) return;
            setUserData(null);
            setError(null);
            setLoading(false);
            return;
        }

        let unsub: Unsubscribe | null = null;
        let cancelled = false;

        setLoading(true);
        (async () => {
            try {
                const [{ doc, onSnapshot }, { getDb }] = await Promise.all([
                    import("firebase/firestore"),
                    import("@/lib/firebase"),
                ]);
                if (cancelled || !mountedRef.current) return;

                const ref = doc(getDb(), "users", user.uid);
                const startSubscription = () => {
                    if (cancelled || !mountedRef.current) return;
                    unsub = onSnapshot(
                        ref,
                        (snapshot) => {
                            if (cancelled || !mountedRef.current) return;
                            setError(null);
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
                                    photoURLUpdatedAt: typeof data.photoURLUpdatedAt === "number" ? data.photoURLUpdatedAt : (data.photoURLUpdatedAt?.toMillis?.() ?? undefined),
                                    wins: typeof data.wins === "number" ? data.wins : 0,
                                    battles: typeof data.battles === "number" ? data.battles : 0,
                                    workshopLines: typeof data.workshopLines === "number" ? data.workshopLines : 1,
                                    createdAt: data.createdAt,
                                    lastLogin: data.lastLogin,
                                    activeUnitId: typeof data.activeUnitId === "string" ? data.activeUnitId : undefined,
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
                            if (cancelled || !mountedRef.current) return;
                            console.error("useUserData error:", err);
                            setError(err as Error);
                            setUserData(null);
                            setLoading(false);
                        }
                    );
                };

                if (typeof window !== "undefined" && "requestIdleCallback" in window) {
                    (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number })
                        .requestIdleCallback(startSubscription, { timeout: 800 });
                } else {
                    setTimeout(startSubscription, 800);
                }
            } catch (err) {
                if (cancelled || !mountedRef.current) return;
                console.error("useUserData setup error:", err);
                setError(err as Error);
                setUserData(null);
                setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
            mountedRef.current = false;
            if (unsub) unsub();
        };
    }, [user, authLoading]);

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
        activeUnitId: userData?.activeUnitId ?? null,
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
