import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSound } from "@/contexts/SoundContext";
import { Coins, ShoppingCart, User, Target, Shield, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUserData } from "@/hooks/useUserData";

interface GlobalHeaderProps {
    className?: string;
    missions?: { title: string; progress: number; target: number; claimed: boolean }[];
}

export function GlobalHeader({ className, missions }: GlobalHeaderProps) {
    const { user } = useAuth();
    const { t } = useLanguage();
    const { playSE } = useSound();
    const [, setLocation] = useLocation();

    const { userData } = useUserData();
    const rankLabel = userData ? (
        userData.level >= 30 ? t('rank_legend') :
            userData.level >= 20 ? t('rank_ace') :
                userData.level >= 10 ? t('rank_veteran') :
                    userData.level >= 5 ? t('rank_soldier') : t('rank_rookie')
    ) : t('rank_rookie');

    const streak = userData?.loginStreak || 0;

    return (
        <>
            <header className={cn(
                "w-full bg-black/60 border-b border-white/5 backdrop-blur-xl flex items-center justify-between px-4 fixed top-0 left-0 right-0 z-50 overflow-hidden pt-[env(safe-area-inset-top)] min-h-[var(--header-height)]",
                className
            )}>
                {/* Left: Player Status */}
                <div
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => {
                        playSE('se_click');
                        setLocation('/profile');
                    }}
                >
                    <div className="w-9 h-9 rounded-lg border border-white/10 glass flex items-center justify-center relative overflow-hidden group-hover:border-neon-cyan/50 transition-colors">
                        {userData?.photoURL ? (
                            <img
                                src={`${userData.photoURL}${userData.photoURL.includes('?') ? '&' : '?'}v=${userData.photoURLUpdatedAt ?? Date.now()}`}
                                alt="Avatar"
                                className="w-full h-full object-cover"
                                loading="eager"
                            />
                        ) : (
                            <User className="w-4 h-4 text-muted-foreground group-hover:text-neon-cyan transition-colors" />
                        )}
                        <div className="absolute bottom-0 inset-x-0 h-1 bg-neon-cyan/30 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-orbitron text-neon-cyan tracking-[0.2em] font-semibold group-hover:neon-text-cyan transition-all">
                                {rankLabel}
                            </span>
                            <div className="w-1 h-1 rounded-full bg-white/20" />
                            <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                                LV.{userData?.level || 1}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-orange-400">
                            <Flame className="w-3.5 h-3.5 fill-orange-500/20" />
                            <span className="font-mono tracking-tighter tabular-nums">
                                {t('streak_count').replace('{count}', streak.toString())}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right: Credits & Shop */}
                <div className="flex items-center gap-3">
                    {/* Credits */}
                    <div className="hidden sm:flex flex-col items-end px-3 py-1 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-[9px] text-muted-foreground/60 font-orbitron tracking-widest leading-none mb-1 uppercase">{t('credits')}</span>
                        <div className="text-sm font-bold font-mono text-neon-cyan leading-none flex items-center gap-1 tabular-nums">
                            <Coins className="w-3 h-3" />
                            {userData?.credits.toLocaleString() || 0}
                        </div>
                    </div>

                    {/* Shop Button */}
                    <Button
                        size="icon"
                        variant="ghost"
                        className="w-9 h-9 rounded-lg border border-white/10 bg-white/5 hover:bg-neon-cyan/10 hover:text-neon-cyan hover:border-neon-cyan/40 transition-all duration-300 relative group"
                        onClick={() => {
                            playSE('se_click');
                            setLocation('/shop');
                        }}
                    >
                        <ShoppingCart className="w-4 h-4 relative z-10" />
                        <div className="absolute inset-0 bg-neon-cyan/0 group-hover:bg-neon-cyan/5 transition-colors" />
                    </Button>
                </div>
            </header>
            {/* Spacer to prevent content overlap */}
            <div className="w-full shrink-0" style={{ height: "calc(var(--header-height) + env(safe-area-inset-top))" }} />
        </>
    );
}
