import React, { memo } from 'react';
import { RobotData } from '@/types/shared';
import RobotSVG from './RobotSVG';
import { ScrambleText } from './ui/ScrambleText';
import { HolographicCard } from './ui/HolographicCard';
import { Trophy } from 'lucide-react';
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

interface RobotCardProps {
    robot: RobotData;
    userName?: string;
    originalItemName?: string;
    /** If true, disables animations (ScrambleText, Hologram) for static generation */
    staticMode?: boolean;
}

const RobotCard = React.forwardRef<HTMLDivElement, RobotCardProps>(({ robot, userName = "COMMANDER", originalItemName, staticMode = false }, ref) => {
    // Rarity color mapping
    const rarityColors: Record<number, string> = {
        1: '#a0a0a0', // Common (Gray)
        2: '#00ccff', // Rare (Cyan)
        3: '#cc00ff', // Epic (Purple)
        4: '#ffd700', // Legendary (Gold)
        5: '#ff0055', // Mythic (Red/Pink)
    };
    const mainColor = rarityColors[robot.rarity || 1] || '#00ccff';

    const getRoleIcon = () => {
        const iconClasses = "w-5 h-5";
        switch (robot.role) {
            case 'ATTACKER': return <RoleIconAttacker className={iconClasses} color={mainColor} />;
            case 'TANK': return <RoleIconTank className={iconClasses} color={mainColor} />;
            case 'SPEED': return <RoleIconSpeed className={iconClasses} color={mainColor} />;
            case 'TRICKY': return <RoleIconTricky className={iconClasses} color={mainColor} />;
            case 'BALANCE': return <RoleIconBalance className={iconClasses} color={mainColor} />;
            default: return <RoleIconBalance className={iconClasses} color={mainColor} />;
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
                {/* Background Layer */}
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 bg-[size:50px_50px]" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black" />

                {/* Decorative Side Lines */}
                <div className="absolute left-4 top-20 bottom-20 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />
                <div className="absolute right-4 top-20 bottom-20 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />

                {/* Header Section */}
                <div className="w-full p-8 pb-4 relative z-20 bg-gradient-to-b from-black to-transparent">
                    <div className="flex justify-between items-start">
                        {/* Name & Role */}
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-orbitron tracking-[0.2em] text-white/50 border border-white/20 px-2 py-0.5 rounded-sm">
                                    UNIT DESIGNATION
                                </span>
                                <div className="h-px w-20 bg-gradient-to-r from-white/30 to-transparent" />
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
                        </div>

                        {/* Rarity Indicator */}
                        <div className="flex flex-col items-end">
                            <div className="text-5xl font-bold font-orbitron opacity-20 absolute -top-4 -right-4 pointer-events-none"
                                style={{ color: mainColor }}>
                                {robot.rarity || 1}
                            </div>
                            <div className="text-lg font-bold font-orbitron mb-1" style={{ color: mainColor }}>
                                <ScrambleText text={robot.rarityName || "UNKNOWN"} delay={300} instant={staticMode} />
                            </div>
                            <div className="flex gap-1.5">
                                {[...Array(5)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`w-2 h-4 transform -skew-x-12 ${i < (robot.rarity || 1)
                                                ? 'bg-gradient-to-b from-white to-transparent opacity-100'
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
                    <div className="absolute w-[500px] h-[500px] border border-white/5 rounded-full animate-[spin_60s_linear_infinite]"
                        style={{ borderStyle: 'dashed' }} />
                    <div className="absolute w-[400px] h-[400px] border border-white/10 rounded-full opacity-30" />

                    {/* Glow behind robot */}
                    <div className="absolute w-[300px] h-[300px] rounded-full blur-[100px] opacity-20"
                        style={{ backgroundColor: mainColor }} />

                    <div className="transform scale-[1.6] drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)]">
                        <RobotSVG
                            parts={robot.parts}
                            colors={robot.colors}
                            size={300}
                            variantKey={robot.variantKey}
                            isRareVariant={(robot.rarity || 1) >= 3}
                            animate={!staticMode}
                        />
                    </div>
                </div>

                {/* Stats & Footer */}
                <div className="w-full relative z-20">
                    {/* Stats Grid */}
                    <div className="px-8 pb-4">
                        <div className="grid grid-cols-3 gap-px bg-gradient-to-r from-transparent via-white/20 to-transparent p-px">
                            {/* HP */}
                            <div className="bg-black/80 backdrop-blur-md p-4 flex flex-col items-center group relative overflow-hidden">
                                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-green-500/50 to-transparent opacity-50" />
                                <StatIconHP className="w-8 h-8 text-green-400 mb-2 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                                <span className="text-[10px] text-gray-500 font-orbitron tracking-widest mb-1">DURABILITY</span>
                                <span className="text-2xl font-bold text-white font-orbitron">
                                    <ScrambleText text={String(robot.baseHp)} delay={800} instant={staticMode} />
                                </span>
                            </div>

                            {/* ATK */}
                            <div className="bg-black/80 backdrop-blur-md p-4 flex flex-col items-center group relative overflow-hidden">
                                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent opacity-50" />
                                <StatIconATK className="w-8 h-8 text-red-400 mb-2 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]" />
                                <span className="text-[10px] text-gray-500 font-orbitron tracking-widest mb-1">OFFENSE</span>
                                <span className="text-2xl font-bold text-white font-orbitron">
                                    <ScrambleText text={String(robot.baseAttack)} delay={900} instant={staticMode} />
                                </span>
                            </div>

                            {/* DEF */}
                            <div className="bg-black/80 backdrop-blur-md p-4 flex flex-col items-center group relative overflow-hidden">
                                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-50" />
                                <StatIconDEF className="w-8 h-8 text-blue-400 mb-2 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                                <span className="text-[10px] text-gray-500 font-orbitron tracking-widest mb-1">DEFENSE</span>
                                <span className="text-2xl font-bold text-white font-orbitron">
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
                                <span className="text-[10px] font-mono text-white/60 tracking-wider">CMDR: {userName}</span>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="text-2xl font-black italic tracking-tighter text-white leading-none">
                                BARCODE <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-blue-500">GENESIS</span>
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
