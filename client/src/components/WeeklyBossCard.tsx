import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { Skull, Loader2, Check, Coins } from "lucide-react";
import { TechCard } from "@/components/ui/TechCard";
import { cn } from "@/lib/utils";

interface WeeklyBossData {
    bossId: string;
    name: string;
    weekKey: string;
    stats: {
        hp: number;
        attack: number;
        defense: number;
        speed: number;
    };
    reward: {
        credits: number;
        xp: number;
    };
}

interface WeeklyBossCardProps {
    boss: WeeklyBossData | null;
    weekKey: string;
    rewardClaimed: boolean;
    lastResult: 'win' | 'loss' | null;
    isLoading?: boolean;
    error?: string | null;
    onChallenge: () => void;
    onRetry?: () => void;
}

export function WeeklyBossCard({
    boss,
    weekKey,
    rewardClaimed,
    lastResult,
    isLoading,
    error,
    onChallenge,
    onRetry
}: WeeklyBossCardProps) {
    const { t } = useLanguage();

    if (isLoading) {
        return (
            <TechCard className="p-4" variant="outline" intensity="low">
                <div className="flex items-center justify-center gap-2 py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                    <span className="text-sm text-muted-foreground">Loading...</span>
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
                            再試行
                        </Button>
                    )}
                </div>
            </TechCard>
        );
    }

    if (!boss) return null;

    return (
        <TechCard
            className={cn(
                "relative overflow-hidden transition-all",
                !rewardClaimed && "border-amber-500/50 bg-amber-500/5"
            )}
            variant="outline"
            intensity={!rewardClaimed ? "high" : "low"}
        >
            {/* Header */}
            <div className="flex items-start justify-between p-4 pb-2">
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "p-2 rounded-lg",
                        rewardClaimed ? "bg-green-500/20" : "bg-amber-500/20"
                    )}>
                        {rewardClaimed ? (
                            <Check className="w-5 h-5 text-green-400" />
                        ) : (
                            <Skull className="w-5 h-5 text-amber-400" />
                        )}
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">今週のボス</h3>
                        <p className="text-[10px] text-muted-foreground">
                            週1回、報酬を獲得
                        </p>
                    </div>
                </div>

                {/* Week indicator */}
                <Badge variant="outline" className="text-amber-400 border-amber-400/50">
                    {weekKey}
                </Badge>
            </div>

            {/* Main content */}
            <div className="px-4 pb-4">
                <div className="flex items-center justify-between bg-black/20 rounded-lg p-3 mb-3">
                    <div>
                        <div className="text-sm font-bold text-white">
                            {boss.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                            HP: {boss.stats.hp} / ATK: {boss.stats.attack}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] text-muted-foreground">報酬</div>
                        <div className="text-xs font-bold text-yellow-400 flex items-center gap-1">
                            <Coins className="w-3 h-3" />
                            {boss.reward.credits} CR + {boss.reward.xp} XP
                        </div>
                    </div>
                </div>

                {rewardClaimed ? (
                    <div className="text-center py-2">
                        <div className="text-green-400 text-sm font-bold">
                            ✓ 今週の報酬獲得済み
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="mt-2 text-muted-foreground"
                            onClick={onChallenge}
                        >
                            再戦する（報酬なし）
                        </Button>
                    </div>
                ) : (
                    <Button
                        size="sm"
                        className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
                        onClick={onChallenge}
                    >
                        <Skull className="w-4 h-4 mr-2" />
                        挑戦する
                    </Button>
                )}
            </div>
        </TechCard>
    );
}
