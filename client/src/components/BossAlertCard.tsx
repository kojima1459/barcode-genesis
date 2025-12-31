import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { Skull, Shield, Zap, RefreshCw, Flame, Loader2 } from "lucide-react";
import RobotSVG from "@/components/RobotSVG";
import { TechCard } from "@/components/ui/TechCard";
import { cn } from "@/lib/utils";

// Boss type definition (matches server)
export type BossType = 'TANK' | 'SPEED' | 'SHIELD' | 'REFLECT' | 'BERSERK';

export interface BossData {
    bossId: string;
    dateKey: string;
    type: BossType;
    name: string;
    epithet: string;
    baseName: string;
    stats: {
        hp: number;
        attack: number;
        defense: number;
        speed: number;
    };
    shieldHp?: number;
    role: string;
    parts: any;
    colors: any;
}

interface BossAlertCardProps {
    boss: BossData | null;
    canChallenge: boolean;
    isLoading?: boolean;
    onChallenge: () => void;
}

const BOSS_TYPE_ICONS: Record<BossType, React.ReactNode> = {
    TANK: <Shield className="w-4 h-4" />,
    SPEED: <Zap className="w-4 h-4" />,
    SHIELD: <Shield className="w-4 h-4" />,
    REFLECT: <RefreshCw className="w-4 h-4" />,
    BERSERK: <Flame className="w-4 h-4" />,
};

const BOSS_TYPE_COLORS: Record<BossType, string> = {
    TANK: "text-gray-400",
    SPEED: "text-blue-400",
    SHIELD: "text-emerald-400",
    REFLECT: "text-purple-400",
    BERSERK: "text-red-400",
};

export function BossAlertCard({ boss, canChallenge, isLoading, onChallenge }: BossAlertCardProps) {
    const { t } = useLanguage();

    if (isLoading) {
        return (
            <TechCard className="border-red-500/30 bg-linear-to-br from-red-500/5 to-orange-500/5">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-red-500" />
                </div>
            </TechCard>
        );
    }

    if (!boss) {
        return null;
    }

    const typeKey = `boss_type_${boss.type.toLowerCase()}` as keyof typeof t;

    return (
        <TechCard className="border-red-500/30 bg-linear-to-br from-red-500/10 to-orange-500/10 relative overflow-hidden">
            {/* Alert Badge */}
            <div className="absolute top-3 right-3 z-10">
                <Badge variant="destructive" className="animate-pulse font-orbitron text-xs">
                    <Skull className="w-3 h-3 mr-1" />
                    {t('boss_alert')}
                </Badge>
            </div>

            <div className="flex gap-4 p-4">
                {/* Boss Visual */}
                <div className="w-24 h-24 relative shrink-0">
                    <div className="absolute inset-0 rounded-lg bg-linear-to-br from-red-500/20 to-orange-500/20 border border-red-500/30" />
                    <RobotSVG
                        parts={boss.parts}
                        colors={boss.colors}
                        size={80}
                        className="relative z-10 m-auto"
                    />
                </div>

                {/* Boss Info */}
                <div className="flex-1 min-w-0">
                    <h3 className="font-orbitron font-bold text-lg text-white truncate">
                        {boss.name}
                    </h3>

                    {/* Type Badge */}
                    <div className={cn("flex items-center gap-1 text-xs mb-2", BOSS_TYPE_COLORS[boss.type])}>
                        {BOSS_TYPE_ICONS[boss.type]}
                        <span className="font-medium">{t(typeKey)}</span>
                        {boss.shieldHp && (
                            <span className="ml-2 text-emerald-400">
                                🛡️ {boss.shieldHp}
                            </span>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-1 text-xs text-muted-foreground mb-3">
                        <div>HP: <span className="text-white">{boss.stats.hp}</span></div>
                        <div>ATK: <span className="text-white">{boss.stats.attack}</span></div>
                        <div>DEF: <span className="text-white">{boss.stats.defense}</span></div>
                        <div>SPD: <span className="text-white">{boss.stats.speed}</span></div>
                    </div>

                    {/* Challenge Button */}
                    <Button
                        size="sm"
                        variant={canChallenge ? "default" : "secondary"}
                        className={cn(
                            "w-full h-9",
                            canChallenge && "bg-red-500 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                        )}
                        onClick={onChallenge}
                        disabled={!canChallenge}
                    >
                        {canChallenge ? (
                            <>
                                <Skull className="w-4 h-4 mr-2" />
                                {t('boss_challenge')}
                            </>
                        ) : (
                            t('boss_completed')
                        )}
                    </Button>
                </div>
            </div>
        </TechCard>
    );
}
