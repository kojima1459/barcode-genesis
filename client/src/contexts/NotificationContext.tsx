import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserData } from "@/hooks/useUserData";
import type { Unsubscribe } from "firebase/firestore";

interface NotificationState {
    badges: {
        scan: boolean;
        workshop: boolean;
        mission: boolean;
        shop: boolean;
    };
}

const NotificationContext = createContext<NotificationState>({
    badges: { scan: false, workshop: false, mission: false, shop: false }
});

function getJstDateKey(): string {
    return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

export function NotificationProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { userData, dailyGenerationCount, lastGenerationDateKey, variantCount, workshopLines } = useUserData();
    const [missionBadge, setMissionBadge] = useState(false);

    // 1. Scan Badge Logic: Show if daily limit not reached (encouraging 3 scans/day)
    const scanBadge = (() => {
        if (!userData) return false;
        const todayKey = getJstDateKey();
        const count = (lastGenerationDateKey === todayKey) ? dailyGenerationCount : 0;
        // FREE_DAILY_LIMIT is 5, but let's encourage at least 3
        return count < 3;
    })();

    // 2. Workshop Badge Logic: Show if slots available AND robots available (>2)
    const workshopBadge = (() => {
        if (!userData) return false;
        const hasSlots = variantCount < workshopLines;
        const hasRobots = (userData.totalRobots || 0) >= 2;
        return hasSlots && hasRobots;
    })();

    // 3. Mission Subscription (Unclaimed Rewards)
    useEffect(() => {
        if (!user) {
            setMissionBadge(false);
            return;
        }

        let unsub: Unsubscribe | null = null;
        let cancelled = false;

        const setup = async () => {
            try {
                const [{ doc, onSnapshot }, { getDb }] = await Promise.all([
                    import("firebase/firestore"),
                    import("@/lib/firebase")
                ]);

                if (cancelled) return;

                const db = getDb();
                const todayKey = getJstDateKey();
                const ref = doc(db, "users", user.uid, "missions", todayKey);

                unsub = onSnapshot(ref, (snap) => {
                    if (cancelled) return;
                    const data = snap.data();
                    if (data?.missions && Array.isArray(data.missions)) {
                        // Check if any mission is COMPLETED but NOT CLAIMED
                        const hasUnclaimed = data.missions.some((m: any) =>
                            m.progress >= m.target && !m.claimed
                        );
                        setMissionBadge(hasUnclaimed);
                    } else {
                        setMissionBadge(false);
                    }
                });
            } catch (err) {
                console.warn("NotificationContext setup error:", err);
            }
        };

        setup();
        return () => {
            cancelled = true;
            if (unsub) unsub();
        };
    }, [user]);

    return (
        <NotificationContext.Provider value={{ badges: { scan: scanBadge, workshop: workshopBadge, mission: missionBadge, shop: false } }}>
            {children}
        </NotificationContext.Provider>
    );
}

export const useNotifications = () => useContext(NotificationContext);
