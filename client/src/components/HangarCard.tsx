import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { RobotData } from "@/types/shared";
import RobotSVG from "@/components/RobotSVG";
import { Wrench, Zap, Settings, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { SystemSkeleton } from "@/components/ui/SystemSkeleton";

interface HangarCardProps {
    robot?: RobotData | null;
    loading?: boolean;
    className?: string;
}

function HangarCard({ robot, loading, className }: HangarCardProps) {
    if (loading) {
        return (
            <SystemSkeleton
                className={cn("w-full aspect-[4/3] md:aspect-[21/9] rounded-xl overflow-hidden", className)}
                text="HANGAR ACCESS..."
                subtext="RETRIEVING ACTIVE UNIT"
            />
        );
    }

    if (!robot) {
        return (
            <div className={cn("relative w-full aspect-[4/3] md:aspect-[21/9] rounded-xl bg-black/40 border border-border/50 overflow-hidden group", className)}>
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-surface2 flex items-center justify-center mb-2 animate-pulse">
                        <Wrench className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                        <h3 className="text-xl font-orbitron font-bold text-muted-foreground tracking-widest">HANGAR EMPTY</h3>
                        <p className="text-sm text-muted-foreground/60 mt-2 font-mono">NO ACTIVE UNITS DETECTED</p>
                    </div>
                    <Link href="/scan">
                        <Button variant="outline" className="border-neon-cyan text-neon-cyan hover:bg-neon-cyan/20">
                            <Zap className="mr-2 w-4 h-4" />
                            INITIALIZE UNIT (SCAN)
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("relative w-full aspect-[4/3] md:aspect-[21/9] rounded-xl bg-[#0a0f18] border border-neon-cyan/30 overflow-hidden group hover:border-neon-cyan/60 transition-colors shadow-[0_0_30px_rgba(0,0,0,0.5)]", className)}>
            {/* Background Ambience */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />

            {/* Robot Display */}
            <div className="absolute inset-0 flex items-center justify-center pb-8 md:pb-0 md:pr-40">
                <div className="relative z-10 scale-125 md:scale-110 drop-shadow-[0_0_25px_rgba(0,243,255,0.15)] opacity-90 group-hover:opacity-100 transition-opacity">
                    <RobotSVG
                        parts={robot.parts}
                        colors={robot.colors}
                        size={280}
                        variant="maintenance"
                        animate={true}
                        showGlow={true}
                        decals={["hazard"]}
                    />
                </div>
            </div>

            {/* Foreground Overlay UI */}
            <div className="absolute inset-0 p-6 flex flex-col justify-between pointer-events-none">

                {/* Top Header */}
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <div className="px-2 py-1 bg-neon-cyan/10 border border-neon-cyan/30 rounded text-[10px] font-orbitron text-neon-cyan animate-pulse">
                            MAINTENANCE MODE
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                            SEC-01 // HANGAR-A
                        </div>
                    </div>
                    <Link href={`/robots/${robot.id}`}>
                        <Button size="sm" variant="ghost" className="pointer-events-auto h-8 text-xs hover:bg-white/5 hover:text-white transition-colors">
                            <Settings className="w-4 h-4 mr-1" />
                            Manage
                        </Button>
                    </Link>
                </div>

                {/* Bottom Info */}
                <div className="mt-auto relative z-20">
                    {/* Mobile Layout: Stacked */}
                    <div className="md:hidden flex flex-col items-center text-center space-y-1">
                        <div className="text-xs font-mono text-neon-cyan tracking-wider opacity-80">ACTIVE UNIT</div>
                        <h2 className="text-2xl font-bold text-white font-orbitron tracking-wide text-shadow-glow">{robot.name}</h2>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono pt-1">
                            <span>LV.{robot.level || 1}</span>
                            <span className="w-1 h-3 bg-white/20" />
                            <span>HP {robot.baseHp}</span>
                        </div>
                    </div>

                    {/* Desktop Layout: Side Info */}
                    <div className="hidden md:block absolute bottom-4 right-4 text-right">
                        <div className="glass-panel p-4 rounded-lg border-l-4 border-l-neon-cyan bg-black/60 backdrop-blur-md min-w-[200px]">
                            <div className="flex items-center justify-end gap-2 text-neon-cyan mb-1">
                                <Activity className="w-4 h-4" />
                                <span className="text-[10px] font-bold tracking-widest">DIAGNOSTICS OK</span>
                            </div>
                            <h2 className="text-xl font-bold text-white font-orbitron truncate max-w-[200px]">{robot.name}</h2>
                            <div className="h-px w-full bg-white/10 my-2" />
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono text-muted-foreground">
                                <span>LVL</span> <span className="text-white text-right">{robot.level || 1}</span>
                                <span>HP</span> <span className="text-white text-right">{robot.baseHp}</span>
                                <span>XP</span> <span className="text-white text-right">{robot.xp || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scanning Line overlay */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                <div className="w-full h-px bg-neon-cyan/30 absolute top-1/2 shadow-[0_0_10px_#00f3ff]" style={{ animation: "scan-line 3s linear infinite" }} />
            </div>
            <style>{`
        @keyframes scan-line {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .text-shadow-glow {
          text-shadow: 0 0 10px rgba(0, 243, 255, 0.5);
        }
      `}</style>
        </div>
    );
}

export default React.memo(HangarCard);
