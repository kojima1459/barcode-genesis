import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { Trophy, Lock, CheckCircle, Loader2, Zap } from "lucide-react";
import { TechCard } from "@/components/ui/TechCard";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

import { MilestoneData, MilestoneBossData } from "@/types/boss";

interface MilestoneBossCardProps {
    userLevel: number;
    milestones: MilestoneData[];
    nextMilestone: number | null;
    bossData: MilestoneBossData | null;
    currentCapacity: number;
    clearedCount: number;
    isLoading?: boolean;
    error?: string | null;
    onChallenge: (level: number) => void;
    onRetry?: () => void;
}

export const MilestoneBossCard = memo(function MilestoneBossCard({
    userLevel,
    milestones,
    nextMilestone,
    bossData,
    currentCapacity,
    clearedCount,
    isLoading,
    error,
    onChallenge,
    onRetry
}: MilestoneBossCardProps) {
    const { t } = useLanguage();

    if (isLoading) {
        return (
            <TechCard className="p-4" variant="outline" intensity="low">
                <div className="flex items-center justify-center gap-2 py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                    <span className="text-sm text-muted-foreground">{t('loading')}</span>
                </div>
            </TechCard>
        );
    }

    if (error) {
        return (
            <TechCard className="p-4" variant="outline" intensity="low">
                <div className="text-center text-red-400 text-sm py-2">
                    {error}
                    {onRetry && (
                        <Button size="sm" variant="ghost" onClick={onRetry} className="ml-2">
                            {t('button_retry')}
                        </Button>
                    )}
                </div>
            </TechCard>
        );
    }

    // Find next challengeable or next locked milestone
    const activeMilestone = milestones.find(m => m.canChallenge)
        || milestones.find(m => m.locked)
        || milestones[milestones.length - 1];

    if (!activeMilestone) return null;

    const allCleared = milestones.every(m => m.cleared);

    return (
        <TechCard
            className={cn(
                "relative overflow-hidden transition-all",
                activeMilestone?.canChallenge && "border-purple-500/50 bg-purple-500/5"
            )}
            variant="outline"
            intensity={activeMilestone?.canChallenge ? "high" : "low"}
        >
            {/* Header */}
            <div className="flex items-start justify-between p-4 pb-2">
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "p-2 rounded-lg",
                        allCleared ? "bg-green-500/20" :
                            activeMilestone?.canChallenge ? "bg-purple-500/20 animate-pulse" :
                                "bg-gray-500/20"
                    )}>
                        {allCleared ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : activeMilestone?.canChallenge ? (
                            <Trophy className="w-5 h-5 text-purple-400" />
                        ) : (
                            <Lock className="w-5 h-5 text-gray-400" />
                        )}
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">{t('milestone_exam')}</h3>
                        <p className="text-[10px] text-muted-foreground">
                            {t('capacity_plus')}
                        </p>
                    </div>
                </div>

                {/* Progress indicator */}
                <div className="text-right">
                    <div className="text-xs text-muted-foreground">{t('cleared_count')}</div>
                    <div className="text-lg font-bold text-purple-400">
                        {clearedCount}/{milestones.length}
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="px-4 pb-4">
                {allCleared ? (
                    <div className="text-center py-4">
                        <div className="text-green-400 font-bold text-sm mb-1">
                            ✨ {t('exam_cleared')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            CAPACITY: {currentCapacity}
                        </div>
                    </div>
                ) : activeMilestone?.canChallenge && bossData ? (
                    <div className="space-y-3">
                        {/* Boss info */}
                        <div className="flex items-center justify-between bg-black/20 rounded-lg p-3">
                            <div>
                                <Badge variant="outline" className="text-purple-400 border-purple-400/50 mb-1">
                                    Lv{bossData.milestoneLevel} {t('milestone_exam')}
                                </Badge>
                                <div className="text-sm font-bold text-white">
                                    {bossData.name}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] text-muted-foreground">{t('reward')}</div>
                                <div className="text-xs font-bold text-yellow-400 flex items-center gap-1">
                                    <Zap className="w-3 h-3" />
                                    {bossData.reward.description}
                                </div>
                            </div>
                        </div>

                        {/* Challenge button */}
                        <Button
                            size="sm"
                            className="w-full bg-purple-500 hover:bg-purple-600 text-white"
                            onClick={() => onChallenge(bossData.milestoneLevel)}
                        >
                            <Trophy className="w-4 h-4 mr-2" />
                            {t('boss_challenge')}
                        </Button>
                    </div>
                ) : activeMilestone?.locked ? (
                    <div className="text-center py-3">
                        <div className="text-muted-foreground text-sm mb-1">
                            <Lock className="w-4 h-4 inline mr-1" />
                            {t('unlock_at_lv', { level: activeMilestone.level })}
                        </div>
                        <div className="text-xs text-gray-500">
                            {t('levels_remaining', { level: activeMilestone.level - userLevel })}
                        </div>
                    </div>
                ) : null}

                {/* Milestone progress dots */}
                <div className="flex justify-center gap-2 mt-3">
                    {milestones.map((m) => (
                        <div
                            key={m.level}
                            className={cn(
                                "w-2 h-2 rounded-full transition-all",
                                m.cleared ? "bg-green-400" :
                                    m.canChallenge ? "bg-purple-400 animate-pulse" :
                                        "bg-gray-600"
                            )}
                            title={`Lv${m.level}`}
                        />
                    ))}
                </div>
            </div>
        </TechCard>
    );
});
