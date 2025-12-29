import React from 'react';
import { RobotData } from '@/types/shared';
import RobotSVG from './RobotSVG';
import { Trophy, Sword, Shield, Heart, Zap } from 'lucide-react';

interface RobotCardProps {
    robot: RobotData;
    userName?: string;
    originalItemName?: string; // Optional: "Coca Cola" etc. if we had it, but mostly we have barcode
}

// Fixed dimensions for the card (Twitter/OGP friendly ratio or vertical card?)
// Let's go with vertical trading card style: 3:4 ratio (e.g. 600x800)
// This fits well on mobile screens and looks good on Twitter (though Twitter crops to 16:9 often, vertical is better for "Card")

const RobotCard = React.forwardRef<HTMLDivElement, RobotCardProps>(({ robot, userName = "COMMANDER", originalItemName }, ref) => {
    // Rarity color mapping
    const rarityColors: Record<number, string> = {
        1: '#a0a0a0', // Common (Gray)
        2: '#00ccff', // Rare (Cyan)
        3: '#cc00ff', // Epic (Purple)
        4: '#ffd700', // Legendary (Gold)
        5: '#ff0055', // Mythic (Red/Pink)
    };
    const mainColor = rarityColors[robot.rarity || 1] || '#00ccff';

    return (
        <div
            ref={ref}
            style={{ width: '600px', height: '800px' }}
            className="bg-black relative overflow-hidden flex flex-col items-center justify-between p-8 font-sans border-8 border-gray-900"
        >
            {/* Background Grid & Gradient */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />

            {/* Border Glow based on rarity */}
            <div
                className="absolute inset-0 border-[4px] opacity-50 z-10 pointer-events-none"
                style={{
                    borderColor: mainColor,
                    boxShadow: `inset 0 0 40px ${mainColor}40`
                }}
            />

            {/* Header: Rarity & Name */}
            <div className="w-full flex justify-between items-start z-20 relative">
                <div className="flex flex-col">
                    <div className="text-xs font-orbitron tracking-widest text-white/70">UNIT DESIGNATION</div>
                    <div className="text-3xl font-black italic text-white uppercase tracking-tighter" style={{ textShadow: `0 0 10px ${mainColor}` }}>
                        {robot.name}
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <div className="text-xs font-orbitron tracking-widest text-white/70">RARITY</div>
                    <div className="text-2xl font-bold font-orbitron" style={{ color: mainColor }}>{robot.rarityName}</div>
                    <div className="flex gap-1 mt-1">
                        {[...Array(robot.rarity || 1)].map((_, i) => (
                            <div key={i} className="w-2 h-2 rotate-45" style={{ backgroundColor: mainColor }} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Visual */}
            <div className="flex-1 w-full flex items-center justify-center relative z-20 my-4">
                {/* Circle/Hexagon Background behind robot */}
                <div className="absolute w-[450px] h-[450px] border border-white/10 rounded-full animate-spin-slow opacity-30"
                    style={{ borderStyle: 'dashed' }} />
                <div className="absolute w-[350px] h-[350px] border border-white/20 rounded-full opacity-50" />

                <div className="transform scale-150 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
                    <RobotSVG parts={robot.parts} colors={robot.colors} size={300} />
                </div>
            </div>

            {/* Stats Panel */}
            <div className="w-full bg-black/60 border border-white/20 backdrop-blur-sm rounded-xl p-6 z-20 space-y-4">
                {/* Battle Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col items-center p-2 bg-white/5 rounded text-center border border-white/10">
                        <Heart className="w-6 h-6 text-neon-green mb-1" />
                        <span className="text-xs text-muted-foreground font-orbitron">HP</span>
                        <span className="text-xl font-bold text-white">{robot.baseHp}</span>
                    </div>
                    <div className="flex flex-col items-center p-2 bg-white/5 rounded text-center border border-white/10">
                        <Sword className="w-6 h-6 text-neon-pink mb-1" />
                        <span className="text-xs text-muted-foreground font-orbitron">ATK</span>
                        <span className="text-xl font-bold text-white">{robot.baseAtk}</span>
                    </div>
                    <div className="flex flex-col items-center p-2 bg-white/5 rounded text-center border border-white/10">
                        <Shield className="w-6 h-6 text-neon-cyan mb-1" />
                        <span className="text-xs text-muted-foreground font-orbitron">DEF</span>
                        <span className="text-xl font-bold text-white">{robot.baseDef}</span>
                    </div>
                </div>

                {/* Flavor Text / Origin */}
                <div className="border-t border-white/10 pt-4 mt-2">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-white/50 bg-white/10 px-2 py-0.5 rounded font-mono">ORIGIN CODE</span>
                        <span className="text-[10px] font-mono text-neon-cyan">{robot.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                    <div className="text-sm text-white/80 italic font-serif leading-snug">
                        "{robot.flavorText || "A mysterious unit generated from an unknown source."}"
                    </div>
                </div>
            </div>

            {/* Footer Brand */}
            <div className="w-full flex justify-between items-end mt-6 z-20">
                <div className="flex gap-2 items-center">
                    <Trophy className="w-5 h-5 text-neon-yellow" />
                    <span className="text-xs font-mono text-white/60">OWNER: {userName}</span>
                </div>
                <div className="text-right">
                    <div className="text-xl font-black italic tracking-tighter text-white">BARCODE <span className="text-neon-cyan">GENESIS</span></div>
                    <div className="text-[10px] text-white/40 tracking-widest">barcodegenesis.app</div>
                </div>
            </div>

        </div>
    );
});

RobotCard.displayName = "RobotCard";

export default RobotCard;
