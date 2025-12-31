import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSound } from "@/contexts/SoundContext";
import { Coins, ShoppingCart, User, Target, Shield, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";

interface GlobalHeaderProps {
    className?: string;
    missions?: { title: string; progress: number; target: number; claimed: boolean }[];
}

export function GlobalHeader({ className, missions }: GlobalHeaderProps) {
    const { user } = useAuth();
    const { t } = useLanguage();
    const { playSE } = useSound();
    const [, setLocation] = useLocation();

    const [userData, setUserData] = useState<{
        credits: number;
        level: number;
        loginStreak: number;
        xp: number;
    } | null>(null);

    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(doc(db, "users", user.uid), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setUserData({
                    credits: data.credits || 0,
                    level: data.level || 1,
                    loginStreak: data.loginStreak || 0,
                    xp: data.xp || 0,
                });
            }
        });
        return () => unsub();
    }, [user]);

    // Rank Calculation
    const getRankLabel = (level: number) => {
        if (level >= 30) return "LEGEND";
        if (level >= 20) return "ACE";
        if (level >= 10) return "VETERAN";
        if (level >= 5) return "SOLDIER";
        return "ROOKIE";
    };

    // Login Streak logic
    const streak = userData?.loginStreak || 0;

    // Mission Logic
    // Show first unfinished mission, or "ALL CLEAR", or "SYSTEM ONLINE" if no data
    const activeMission = missions?.find(m => !m.claimed && m.progress < m.target);
    const missionText = missions
        ? (activeMission
            ? `${activeMission.title} ${activeMission.progress}/${activeMission.target}`
            : (missions.length > 0 ? "ALL MISSIONS CLEAR" : "NO ORDERS"))
        : "SYSTEM ONLINE";

    const rankLabel = userData ? getRankLabel(userData.level) : "...";

    return (
        <header className={cn(
            "w-full h-14 bg-black/80 border-b border-white/10 backdrop-blur-md flex items-center justify-between px-3 md:px-6 relative z-50",
            className
        )}>
            {/* Left: Player Status */}
            <div
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => {
                    playSE('se_click');
                    setLocation('/profile');
                }}
            >
                <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-orbitron text-neon-cyan tracking-wider font-bold">
                            {rankLabel}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                            Lv.{userData?.level || 1}
                        </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-orange-500">
                        <Flame className="w-3 h-3 fill-orange-500" />
                        <span className="font-mono">{streak}</span>
                    </div>
                </div>
            </div>

            {/* Center: Mission/Status */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] text-center">
                <div className="text-[10px] md:text-xs font-mono text-muted-foreground/80 truncate px-2 border-x border-white/5 bg-black/20 py-1 rounded">
                    {missionText}
                </div>
            </div>

            {/* Right: Credits & Shop */}
            <div className="flex items-center gap-3">
                {/* Credits */}
                <div className="flex flex-col items-end mr-1">
                    <span className="text-[10px] text-muted-foreground font-orbitron tracking-widest">CREDITS</span>
                    <div className="text-sm font-bold font-mono text-neon-cyan leading-none">
                        {userData?.credits.toLocaleString() || 0}
                    </div>
                </div>

                {/* Shop Button */}
                <Button
                    size="icon"
                    variant="ghost"
                    className="w-8 h-8 rounded-full border border-white/10 bg-surface1/50 hover:bg-neon-cyan/20 hover:text-neon-cyan hover:border-neon-cyan/50"
                    onClick={() => {
                        playSE('se_click');
                        setLocation('/shop');
                    }}
                >
                    <ShoppingCart className="w-4 h-4" />
                </Button>
            </div>
        </header>
    );
}
