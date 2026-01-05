import React, { memo } from 'react';
import { RobotData } from '@/types/shared';
import RobotSVG from './RobotSVG';
import { ScrambleText } from './ui/ScrambleText';
import { HolographicCard } from './ui/HolographicCard';
import { Trophy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
    StatIconHP,
    StatIconATK,
    StatIconDEF,
    RoleIconAttacker,
    RoleIconTank,
    RoleIconSpeed,
    RoleIconTricky,
    RoleIconBalance
} from './StatIcons';

// Rarity Names for display
const RARITY_NAMES: Record<number, string> = {
    1: "N",
    2: "R",
    3: "SR",
    4: "UR",
    5: "LR"
};

interface RobotCardProps {
    robot: RobotData;
    userName?: string;
    originalItemName?: string;
    /** If true, disables animations (ScrambleText, Hologram) for static generation */
    staticMode?: boolean;
}

const RobotCard = React.forwardRef<HTMLDivElement, RobotCardProps>(({ robot, userName, originalItemName, staticMode = false }, ref) => {
    const { t } = useLanguage();
    const resolvedUserName = userName ?? t('label_commander');
    // Rarity color mapping (Legacy + Phase B)
    const getRarityColor = () => {
        if (robot.rarityTier === 'legendary') return '#ffd700'; // Gold
        if (robot.rarityTier === 'rare') return '#00ccff'; // Cyan
        if (robot.rarityTier === 'common') return '#a0a0a0'; // Gray

        // Legacy fallbacks
        const colors: Record<number, string> = {
            1: '#a0a0a0', 2: '#00ccff', 3: '#cc00ff', 4: '#ffd700', 5: '#ff0055'
        };
        return colors[robot.rarity || 1] || '#00ccff';
    };
    const mainColor = getRarityColor();

    const getRoleIcon = () => {
        const iconClasses = "w-5 h-5";
        const roleStr = String(robot.role || '').toUpperCase();

        switch (roleStr) {
            case 'ASSAULT':  // New system
            case 'ATTACKER': // Legacy
            case 'STRIKER':  // Phase B legacy
                return <RoleIconAttacker className={iconClasses} color={mainColor} />;
            case 'TANK':
                return <RoleIconTank className={iconClasses} color={mainColor} />;
            case 'SNIPER':   // New system
            case 'SPEED':    // Legacy
                return <RoleIconSpeed className={iconClasses} color={mainColor} />;
            case 'TRICKSTER': // New system
            case 'TRICKY':    // Legacy
                return <RoleIconTricky className={iconClasses} color={mainColor} />;
            case 'SUPPORT':
                return <RoleIconBalance className={iconClasses} color={mainColor} />;
            case 'BALANCE':  // Legacy
            case 'BALANCED': // Phase B legacy
            default:
                return <RoleIconBalance className={iconClasses} color={mainColor} />;
        }
    };

    return (
        <HolographicCard
            className="rounded-none bg-transparent"
            intensity={staticMode ? 0 : 0.4}
            glowColor={mainColor}
        >
            <div
                ref={ref}
                style={{ width: '600px', height: '800px' }}
                className="bg-black relative overflow-hidden flex flex-col items-center justify-between p-0 font-sans"
            >
                {/* Background Layer with Depth */}
                <div className="absolute inset-0 bg-background" />
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.08] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
                <div className="absolute inset-0 bg-noise opacity-[0.03] mix-blend-overlay" />
                <div className="absolute inset-x-0 top-0 h-64 bg-linear-to-b from-primary/10 to-transparent" />

                {/* Decorative Side Lines */}
                <div className="absolute left-4 top-20 bottom-20 w-px bg-linear-to-b from-transparent via-white/20 to-transparent" />
                <div className="absolute right-4 top-20 bottom-20 w-px bg-linear-to-b from-transparent via-white/20 to-transparent" />

                {/* Header Section */}
                <div className="w-full p-8 pb-4 relative z-20 bg-linear-to-b from-black to-transparent">
                    <div className="flex justify-between items-start">
                        {/* Name & Role */}
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-orbitron tracking-[0.2em] text-white/50 border border-white/20 px-2 py-0.5 rounded-sm">
                                    UNIT DESIGNATION
                                </span>
                                <div className="h-px w-20 bg-linear-to-r from-white/30 to-transparent" />
                            </div>

                            {robot.epithet && (
                                <div className="text-xl font-bold text-neon-cyan opacity-90 tracking-wide font-sans mt-2"
                                    style={{ textShadow: `0 0 10px ${mainColor}80` }}>
                                    <ScrambleText text={robot.epithet} delay={200} instant={staticMode} />
                                </div>
                            )}

                            <div className="text-4xl font-black italic text-white uppercase tracking-tighter mt-1"
                                style={{
                                    textShadow: `0 0 20px ${mainColor}60`,
                                }}>
                                <ScrambleText text={robot.name} delay={400} instant={staticMode} />
                            </div>

                            {robot.roleName && (
                                <div className="flex items-center gap-2 mt-3 pl-1">
                                    {getRoleIcon()}
                                    <span className="text-sm font-orbitron tracking-wider text-white/80">
                                        <ScrambleText text={robot.roleName} delay={600} instant={staticMode} />
                                    </span>
                                </div>
                            )}

                            {/* Phase B Badges */}
                            <div className="flex gap-2 mt-2 pl-1">
                                {robot.rarityTier && (
                                    <span className="px-1.5 py-0.5 border rounded text-[10px] uppercase font-orbitron tracking-wider bg-black/60 backdrop-blur-sm shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                                        style={{ borderColor: `${mainColor}60`, color: mainColor, textShadow: `0 0 5px ${mainColor}80` }}>
                                        {robot.rarityTier}
                                    </span>
                                )}
                                {robot.role && ['assault', 'tank', 'sniper', 'support', 'trickster', 'striker', 'speed', 'balanced', 'balance', 'tricky', 'attacker'].includes(String(robot.role).toLowerCase()) && (
                                    <span className="px-1.5 py-0.5 border rounded text-[10px] uppercase font-orbitron tracking-wider bg-black/60 backdrop-blur-sm border-white/30 text-white/80 shadow-sm">
                                        {String(robot.role).toUpperCase()}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Rarity Indicator */}
                        <div className="flex flex-col items-end">
                            <div className="text-5xl font-orbitron font-semibold opacity-20 absolute -top-4 -right-4 pointer-events-none"
                                style={{ color: mainColor }}>
                                {robot.rarity || 1}
                            </div>
                            <div className="text-lg font-orbitron font-semibold mb-1" style={{ color: mainColor }}>
                                <ScrambleText text={robot.rarityName || t('label_unknown')} delay={300} instant={staticMode} />
                            </div>
                            <div className="flex gap-1.5">
                                {[...Array(5)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`w-2 h-4 transform -skew-x-12 ${i < (robot.rarity || 1)
                                            ? 'bg-linear-to-b from-white to-transparent opacity-100'
                                            : 'bg-white/10'
                                            }`}
                                        style={i < (robot.rarity || 1) ? { backgroundColor: mainColor } : {}}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Visual Area */}
                <div className="flex-1 w-full flex items-center justify-center relative z-10 -mt-10">
                    {/* Tech Ring Background */}
                    {/* Rarity Aura */}
                    <div className="absolute w-[350px] h-[350px] rounded-full blur-[100px] transition-all duration-1000"
                        style={{
                            backgroundColor: `${mainColor}20`,
                            animation: `pulse-slow 4s ease-in-out infinite`
                        }} />

                    {/* Visual Frame */}
                    <div className="absolute inset-16 border border-white/5 tech-border pointer-events-none opacity-40" />

                    <div className="transform scale-[1.7] drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative z-10">
                        <RobotSVG
                            parts={robot.parts}
                            colors={robot.colors}
                            size={300}
                            variantKey={robot.variantKey}
                            isRareVariant={(robot.rarityTier === 'legendary' || robot.rarityTier === 'rare' || (robot.rarity || 1) >= 3)}
                            animate={!staticMode}
                            role={typeof robot.role === 'string' ? robot.role : undefined}
                            rarityEffect={robot.rarityTier === 'legendary' ? 'legendary' : (robot.rarityTier === 'rare' ? 'rare' : undefined)}
                        />
                    </div>

                    {/* Rarity Floating Badge */}
                    <div
                        className="absolute right-12 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-20"
                        style={{
                            textShadow: `0 0 10px ${mainColor}`,
                            animation: 'float 6s ease-in-out infinite'
                        }}
                    >
                        <div className="w-px h-12 bg-linear-to-b from-transparent to-white/40" />
                        <div className="p-2 rounded-full border border-white/20 glass flex items-center justify-center">
                            <span className="text-sm font-orbitron font-semibold" style={{ color: mainColor }}>
                                {RARITY_NAMES[robot.rarity || 1] || 'N'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Stats & Footer */}
                <div className="w-full relative z-20">
                    {/* Stats Grid */}
                    {/* Stats Grid - Premium Glass */}
                    <div className="px-8 pb-4">
                        <div className="grid grid-cols-3 gap-3">
                            {/* HP */}
                            <div className="glass-panel rounded-xl p-4 flex flex-col items-center group relative overflow-hidden transition-all hover:scale-105">
                                <StatIconHP className="w-8 h-8 text-green-400/80 mb-2 drop-shadow-[0_0_8px_rgba(74,222,128,0.3)]" />
                                <span className="text-[9px] text-white/40 font-orbitron tracking-widest mb-1">DURABILITY</span>
                                <span className="text-2xl font-orbitron font-semibold text-white tabular-nums">
                                    <ScrambleText text={String(robot.baseHp)} delay={800} instant={staticMode} />
                                </span>
                            </div>

                            {/* ATK */}
                            <div className="glass-panel rounded-xl p-4 flex flex-col items-center group relative overflow-hidden transition-all hover:scale-105">
                                <StatIconATK className="w-8 h-8 text-red-400/80 mb-2 drop-shadow-[0_0_8px_rgba(248,113,113,0.3)]" />
                                <span className="text-[9px] text-white/40 font-orbitron tracking-widest mb-1">OFFENSE</span>
                                <span className="text-2xl font-orbitron font-semibold text-white tabular-nums">
                                    <ScrambleText text={String(robot.baseAttack)} delay={900} instant={staticMode} />
                                </span>
                            </div>

                            {/* DEF */}
                            <div className="glass-panel rounded-xl p-4 flex flex-col items-center group relative overflow-hidden transition-all hover:scale-105">
                                <StatIconDEF className="w-8 h-8 text-blue-400/80 mb-2 drop-shadow-[0_0_8px_rgba(96,165,250,0.3)]" />
                                <span className="text-[10px] text-white/40 font-orbitron tracking-widest mb-1">DEFENSE</span>
                                <span className="text-2xl font-orbitron font-semibold text-white tabular-nums">
                                    <ScrambleText text={String(robot.baseDefense)} delay={1000} instant={staticMode} />
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div className="bg-black/90 border-t border-white/10 px-8 py-5 flex justify-between items-end">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-white/40 font-mono tracking-tighter">ID CODE:</span>
                                <span className="text-xs font-mono text-neon-cyan tracking-widest">{robot.id.slice(0, 12).toUpperCase()}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <Trophy className="w-3 h-3 text-neon-yellow" />
                                <span className="text-[10px] font-mono text-white/60 tracking-wider">CMDR: {resolvedUserName}</span>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="text-2xl font-black italic tracking-tighter text-white leading-none">
                                BARCODE <span className="text-transparent bg-clip-text bg-linear-to-r from-neon-cyan to-blue-500">GENESIS</span>
                            </div>
                            <div className="text-[9px] text-white/30 tracking-[0.3em] mt-1 uppercase">Tactical Unit Card</div>
                        </div>
                    </div>
                </div>
            </div>
        </HolographicCard>
    );
});

RobotCard.displayName = "RobotCard";

export default memo(RobotCard);
