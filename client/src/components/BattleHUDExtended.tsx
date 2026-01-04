import { memo, useMemo } from "react";
import { BattleEvent } from "@/lib/battleReplay";
import { Sword, Shield, Zap, Users, AlertTriangle, Target, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface BattleHUDExtendedProps {
    // Robot info
    p1Id: string;
    p2Id: string;
    p1Name: string;
    p2Name: string;
    p1MaxHp: number;
    p2MaxHp: number;
    // Current HP
    currentHp: Record<string, number>;
    // Current event data (for HUD updates)
    currentEvent: BattleEvent | null;
    // Last known gauge values (persisted)
    p1OverdriveGauge: number;
    p2OverdriveGauge: number;
    nextHitKills?: boolean;
}

/**
 * BattleHUDExtended - Extended HUD overlay showing:
 * A. Advantage indicator (YOU ADV / ENEMY ADV / EVEN)
 * B. Stance result visualization
 * C. Overdrive gauge bars
 * D. Status flags (guard, stun, item, cheer, boss shield)
 */
const BattleHUDExtended = memo(({
    p1Id,
    p2Id,
    p1Name,
    p2Name,
    p1MaxHp,
    p2MaxHp,
    currentHp,
    currentEvent,
    p1OverdriveGauge,
    p2OverdriveGauge,
    nextHitKills
}: BattleHUDExtendedProps) => {
    const { t } = useLanguage();
    // A. Advantage calculation
    const advantage = useMemo(() => {
        const p1HpRatio = (currentHp[p1Id] ?? p1MaxHp) / p1MaxHp;
        const p2HpRatio = (currentHp[p2Id] ?? p2MaxHp) / p2MaxHp;
        const diff = p1HpRatio - p2HpRatio;

        if (diff >= 0.2) return { text: t("battle_advantage"), color: "text-cyan-400", bg: "bg-cyan-500/20" };
        if (diff <= -0.2) return { text: t("battle_disadvantage"), color: "text-red-400", bg: "bg-red-500/20" };
        return { text: t("battle_even"), color: "text-yellow-400", bg: "bg-yellow-500/20" };
    }, [currentHp, p1Id, p2Id, p1MaxHp, p2MaxHp, t]);

    const hpDiff = useMemo(() => {
        const p1Hp = currentHp[p1Id] ?? p1MaxHp;
        const p2Hp = currentHp[p2Id] ?? p2MaxHp;
        return p1Hp - p2Hp;
    }, [currentHp, p1Id, p2Id, p1MaxHp, p2MaxHp]);

    const nextActor = useMemo(() => {
        if (!currentEvent?.attackerId) return null;
        return currentEvent.attackerId === p1Id ? p1Name : p2Name;
    }, [currentEvent, p1Id, p2Id, p1Name, p2Name]);

    // B. Stance visualization
    const stanceInfo = useMemo(() => {
        if (!currentEvent?.stanceAttacker) return null;

        const stanceIcon = (stance: string) => {
            switch (stance) {
                case 'ATTACK': return <Sword className="w-3 h-3" />;
                case 'GUARD': return <Shield className="w-3 h-3" />;
                case 'TRICK': return <Zap className="w-3 h-3" />;
                default: return null;
            }
        };

        const outcomeColor = {
            'WIN': 'text-green-400',
            'LOSE': 'text-red-400',
            'DRAW': 'text-yellow-400'
        }[currentEvent.stanceOutcome || 'DRAW'];

        return {
            attacker: currentEvent.stanceAttacker,
            defender: currentEvent.stanceDefender,
            outcome: currentEvent.stanceOutcome,
            attackerIcon: stanceIcon(currentEvent.stanceAttacker),
            defenderIcon: stanceIcon(currentEvent.stanceDefender || ''),
            outcomeColor
        };
    }, [currentEvent]);

    // D. Status flags
    const statusFlags = useMemo(() => {
        const flags: { icon: React.ReactNode; label: string; color: string }[] = [];

        if (currentEvent?.guarded) {
            flags.push({
                icon: <Shield className="w-3 h-3" />,
                label: "GUARD",
                color: "text-blue-400 bg-blue-500/20"
            });
        }

        if (currentEvent?.stunApplied || currentEvent?.stunned) {
            flags.push({
                icon: <AlertTriangle className="w-3 h-3" />,
                label: "STUN",
                color: "text-purple-400 bg-purple-500/20"
            });
        }

        if (currentEvent?.itemApplied && currentEvent.itemType) {
            flags.push({
                icon: <Target className="w-3 h-3" />,
                label: currentEvent.itemType,
                color: "text-amber-400 bg-amber-500/20"
            });
        }

        if (currentEvent?.cheerApplied) {
            flags.push({
                icon: <Users className="w-3 h-3" />,
                label: `CHEER ${currentEvent.cheerSide || ''}`,
                color: "text-pink-400 bg-pink-500/20"
            });
        }

        if (currentEvent?.bossShieldRemaining !== undefined) {
            flags.push({
                icon: <Shield className="w-3 h-3" />,
                label: currentEvent.bossShieldBroken ? "SHIELD BREAK!" : `SHIELD ${currentEvent.bossShieldRemaining}`,
                color: currentEvent.bossShieldBroken ? "text-red-400 bg-red-500/20" : "text-emerald-400 bg-emerald-500/20"
            });
        }

        if (currentEvent?.finisherApplied) {
            flags.push({
                icon: <Sparkles className="w-3 h-3" />,
                label: "FINISHER!",
                color: "text-yellow-400 bg-yellow-500/20"
            });
        }

        if (nextHitKills) {
            flags.push({
                icon: <AlertTriangle className="w-3 h-3" />,
                label: t("battle_next_hit_kills"),
                color: "text-red-400 bg-red-500/20"
            });
        }

        return flags;
    }, [currentEvent, nextHitKills, t]);

    return (
        <div className="flex flex-col items-center w-full mt-2">
            {/* A. Visual Advantage Bar */}
            < div className="w-full max-w-[200px] mb-1" >
                <div className="flex justify-between text-[8px] font-black italic text-white/30 px-1 mb-0.5 font-orbitron">
                    <span>ENEMY ADV</span>
                    <span>EVEN</span>
                    <span>YOU ADV</span>
                </div>
                <div className="h-1.5 bg-black/60 rounded-full border border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/20 -translate-x-1/2" />
                    {/* Indicator */}
                    <div
                        className={`absolute top-0 bottom-0 w-1.5 rounded-full shadow-[0_0_5px_currentColor] transition-all duration-500 ease-out ${advantage.color.replace('text-', 'bg-')
                            }`}
                        style={{
                            left: `${50 + (Math.max(-1, Math.min(1,
                                ((currentHp[p1Id] ?? p1MaxHp) / p1MaxHp) - ((currentHp[p2Id] ?? p2MaxHp) / p2MaxHp)
                            )) * 45)}%`
                        }}
                    />
                </div>
                {/* Numeric Diff */}
                <div className="text-center mt-0.5">
                    <span className={`text-[9px] font-black italic ${hpDiff >= 0 ? "text-cyan-400" : "text-pink-400"}`}>
                        {hpDiff > 0 ? "+" : ""}{hpDiff}
                    </span>
                </div>
            </div >

            {/* A3. Next Action / Stance Status Line */}
            < div className="w-full flex justify-center mb-1" >
                {
                    stanceInfo ? (
                        <div className="flex items-center gap-2 px-3 py-1 rounded bg-black/60 border border-white/10 animate-in fade-in slide-in-from-bottom-2" >
                            <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-cyan-400">
                                {stanceInfo.attackerIcon}
                                {stanceInfo.attacker}
                            </span>
                            <span className="text-[8px] text-white/30">vs</span>
                            <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-pink-400">
                                {stanceInfo.defenderIcon}
                                {stanceInfo.defender}
                            </span>
                        </div>
                    ) : nextActor ? (
                        <div className="px-3 py-1 rounded bg-black/40 border border-white/5 text-[10px] font-mono text-white/50">
                            Targeting: <span className="text-white/80 font-bold">{nextActor === p1Name ? "PLAYER" : "OPPONENT"}</span>
                        </div>
                    ) : (
                        <div className="h-6" /> // Spacer
                    )}
            </div >

            {/* C. Overdrive Gauges */}
            < div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-black/40 border border-white/10" >
                <span className="text-[8px] font-black italic text-white/50">必殺</span>
                {/* P1 Gauge */}
                <div className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-cyan-400" />
                    <div className="w-12 h-1.5 bg-black/60 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300 transition-all duration-300"
                            style={{ width: `${p1OverdriveGauge}%` }}
                        />
                    </div>
                </div>

                <div className="w-px h-3 bg-white/20" />

                {/* P2 Gauge */}
                <div className="flex items-center gap-1">
                    <div className="w-12 h-1.5 bg-black/60 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-pink-500 to-pink-300 transition-all duration-300"
                            style={{ width: `${p2OverdriveGauge}%` }}
                        />
                    </div>
                    <Zap className="w-3 h-3 text-pink-400" />
                </div>
            </div >

            {/* D. Status Flags */}
            {
                statusFlags.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1 mt-1 w-full max-w-md">
                        {statusFlags.map((flag, i) => (
                            <div
                                key={i}
                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold ${flag.color} border border-white/10 animate-in zoom-in duration-300`}
                            >
                                {flag.icon}
                                <span>{flag.label}</span>
                            </div>
                        ))}
                    </div>
                )
            }
        </div >
    );
});

BattleHUDExtended.displayName = 'BattleHUDExtended';

export default BattleHUDExtended;
