import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BattleResult, RobotData } from "@/types/shared";
import { BattleEvent, generateBattleEvents } from "@/lib/battleReplay";
import RobotSVG from "@/components/RobotSVG";
import { useSound } from "@/contexts/SoundContext";
import { useRobotFx } from "@/hooks/useRobotFx";
import { CountUp } from "@/components/ui/CountUp";
import { Button } from "@/components/ui/button";
import ShareButton from "@/components/ShareButton";
import { Zap } from "lucide-react";

interface BattleReplayProps {
    p1: RobotData;
    p2: RobotData;
    result: BattleResult;
    onComplete: () => void;
}

export default function BattleReplay({ p1, p2, result, onComplete }: BattleReplayProps) {
    const { playSE, playBGM } = useSound();
    const { fx } = useRobotFx();

    const [events, setEvents] = useState<BattleEvent[]>([]);
    const [currentEventIndex, setCurrentEventIndex] = useState(0);

    // Game State
    const [hp, setHp] = useState<Record<string, number>>({ [p1.id]: p1.baseHp, [p2.id]: p2.baseHp });
    const [activeMessage, setActiveMessage] = useState<string>("");
    const [isFinished, setIsFinished] = useState(false);

    // Visual States
    const [shakeId, setShakeId] = useState<string | null>(null);
    const [flashId, setFlashId] = useState<string | null>(null); // For hit flash
    const [popups, setPopups] = useState<{ id: string, text: string, type: 'damage' | 'crit' | 'miss', targetId: string }[]>([]);
    const [lungeId, setLungeId] = useState<string | null>(null); // Who is attacking

    // Pacing
    const [speed, setSpeed] = useState(1);
    const [isSkipped, setIsSkipped] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hasEndedRef = useRef(false);

    // Initial Setup
    useEffect(() => {
        const generated = generateBattleEvents(result.logs, p1.id, p2.id);
        setEvents(generated);
        setCurrentEventIndex(0);
        setHp({ [p1.id]: p1.baseHp, [p2.id]: p2.baseHp });
        playBGM('bgm_battle');
        playSE('se_equip'); // Start sound
    }, [result, p1.id, p2.id]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    // Event Loop
    useEffect(() => {
        if (events.length === 0) return;
        if (hasEndedRef.current) return;

        if (currentEventIndex >= events.length) {
            handleBattleEnd();
            return;
        }

        const event = events[currentEventIndex];
        let delay = (event.delay || 0) / speed;
        if (isSkipped) delay = 20; // Super fast but not instant to allow state updates

        const execute = () => {
            // Process Event Side Effects
            switch (event.type) {
                case 'LOG_MESSAGE':
                    if (event.message) setActiveMessage(event.message);
                    break;
                case 'ATTACK_PREPARE':
                    if (event.attackerId) {
                        setLungeId(event.attackerId);
                        setTimeout(() => setLungeId(null), 200 / speed);
                    }
                    break;
                case 'ATTACK_IMPACT':
                    if (event.defenderId) {
                        // Shake
                        setShakeId(event.defenderId);
                        setTimeout(() => setShakeId(null), 300 / speed);

                        // Sound
                        if (event.isMiss) {
                            // playSE('se_miss'); // If generic miss sound exists
                        } else if (event.isCritical) {
                            playSE('se_hit_heavy'); // Use mapped sound
                        } else {
                            playSE('se_hit_light');
                        }
                    }
                    break;
                case 'DAMAGE_POPUP':
                    if (event.defenderId) {
                        const popupId = Math.random().toString();
                        let text = String(event.damage);
                        let type: 'damage' | 'crit' | 'miss' = 'damage';
                        if (event.isMiss) { text = "MISS"; type = 'miss'; }
                        else if (event.isCritical) { type = 'crit'; }

                        setPopups(prev => [...prev, { id: popupId, text, type, targetId: event.defenderId! }]);
                        setTimeout(() => {
                            setPopups(prev => prev.filter(p => p.id !== popupId));
                        }, 1000);
                    }
                    break;
                case 'HP_UPDATE':
                    if (event.currentHp) {
                        setHp(prev => ({ ...prev, ...event.currentHp }));
                    }
                    break;
            }

            // Next event
            setCurrentEventIndex(prev => prev + 1);
        };

        timeoutRef.current = setTimeout(execute, delay);
    }, [currentEventIndex, events, speed, isSkipped]);


    const handleBattleEnd = () => {
        if (hasEndedRef.current) return;
        hasEndedRef.current = true;

        const isWin = result.winnerId === p1.id;
        playSE(isWin ? 'se_win' : 'se_lose');
        setIsFinished(true);
    };

    const handleSkip = () => {
        setIsSkipped(true);
    };

    // Helper for visual calculation
    const getHpPercent = (id: string, max: number) => {
        const current = hp[id] ?? max;
        return Math.max(0, Math.min(100, (current / max) * 100));
    };

    return (
        <div className="space-y-8 relative py-8 w-full">
            {/* Pacing Controls */}
            {!isFinished && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 flex gap-2 speed-controls px-4 py-2 rounded-full glass-panel border border-white/10">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSpeed(prev => prev === 1 ? 2 : 1)}
                        className={`text-xs font-bold ${speed === 2 ? "text-neon-cyan" : "text-white/70 hover:text-white"}`}
                    >
                        {speed === 2 ? "×2 ON" : "×2"}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSkip}
                        className="text-xs font-bold text-white/70 hover:text-white"
                    >
                        SKIP ⏭
                    </Button>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10 w-full">
                {/* P1 Cards */}
                <RobotCard
                    robot={p1}
                    hpPercent={getHpPercent(p1.id, p1.baseHp)}
                    currentHp={hp[p1.id]}
                    isShaking={shakeId === p1.id}
                    isLunging={lungeId === p1.id}
                    isPlayer={true}
                    fx={fx}
                    popups={popups.filter(p => p.targetId === p1.id)}
                />

                <div className="text-5xl font-black text-white/10 italic relative z-0 md:absolute md:left-1/2 md:-translate-x-1/2">
                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 text-9xl opacity-10 blur-sm pointer-events-none">VS</span>
                    VS
                </div>

                {/* P2 Cards */}
                <RobotCard
                    robot={p2}
                    hpPercent={getHpPercent(p2.id, p2.baseHp)}
                    currentHp={hp[p2.id]}
                    isShaking={shakeId === p2.id}
                    isLunging={lungeId === p2.id}
                    isPlayer={false}
                    fx={fx}
                    popups={popups.filter(p => p.targetId === p2.id)}
                />
            </div>

            {/* Battle Logs */}
            <div className={`mt-8 h-24 overflow-y-auto glass-panel p-4 rounded-xl text-sm font-mono flex items-center justify-center transition-opacity ${isFinished ? 'opacity-0' : 'opacity-100'}`}>
                <div className="text-center font-bold text-lg animate-pulse">
                    {activeMessage || "Battle Start!"}
                </div>
            </div>

            {/* Result Overlay */}
            <AnimatePresence>
                {isFinished && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`absolute inset-0 z-50 flex items-center justify-center backdrop-blur-md rounded-lg p-4 ${result.winnerId === p1.id ? "battle-win-overlay" : "battle-lose-overlay"}`}
                    >
                        <motion.div
                            initial={{ scale: 0.5, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            className="text-center space-y-8 p-10 glass-panel border-neon-cyan shadow-[0_0_50px_rgba(0,243,255,0.2)] max-w-md w-full relative overflow-hidden"
                        >
                            <h2 className={`text-5xl md:text-7xl font-black italic tracking-tighter ${result.winnerId === p1.id ? "text-neon-cyan neon-text-cyan" : "text-red-500"}`}>
                                {result.winnerId === p1.id ? "VICTORY" : "DEFEAT"}
                            </h2>

                            {result.winnerId === p1.id && (
                                <div className="text-yellow-400 font-bold text-xl flex flex-col items-center gap-2 bg-black/40 p-4 rounded border border-yellow-500/30">
                                    <div className="flex items-center gap-2">
                                        <Zap className="w-5 h-5 text-yellow-400" />
                                        <span>
                                            Gets: <CountUp value={result.rewards.credits ?? 0} prefix="+" suffix=" cr" /> / <CountUp value={result.rewards.exp ?? 0} prefix="+" suffix=" XP" />
                                        </span>
                                    </div>
                                </div>
                            )}

                            <Button size="lg" onClick={onComplete} className="w-full bg-neon-cyan text-black hover:bg-white font-bold h-12 text-lg">
                                CONTINUE
                            </Button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function RobotCard({ robot, hpPercent, currentHp, isShaking, isLunging, isPlayer, fx, popups }: any) {
    // Determine visuals
    const borderColor = isShaking ? 'border-red-500' : (isPlayer ? 'border-neon-cyan' : 'border-neon-pink');
    const shadowColor = isShaking ? 'shadow-[0_0_20px_rgba(255,0,0,0.5)]' : (isPlayer ? 'shadow-[0_0_10px_rgba(0,243,255,0.3)]' : 'shadow-[0_0_10px_rgba(255,0,85,0.3)]');

    // Animation variants
    const shakeAnim = { x: [-10, 10, -10, 10, 0], rotate: isPlayer ? [-2, 2, -2, 2, 0] : [2, -2, 2, -2, 0] };
    const lungeAnim = { x: isPlayer ? 50 : -50, scale: 1.1 };

    return (
        <motion.div
            className={`relative p-6 rounded-xl glass-panel w-full md:w-[45%] ${borderColor} ${shadowColor} transition-colors duration-200`}
            animate={isShaking ? shakeAnim : (isLunging ? lungeAnim : { x: 0, scale: 1 })}
            transition={{ duration: isShaking ? 0.4 : 0.2 }}
        >
            <div className={`absolute -top-3 ${isPlayer ? 'left-4 text-neon-cyan border-neon-cyan' : 'right-4 text-neon-pink border-neon-pink'} bg-panel/80 px-3 py-1 text-xs font-orbitron border tracking-[0.12em]`}>
                {isPlayer ? 'PLAYER' : 'OPPONENT'}
            </div>

            <div className="flex justify-center my-4">
                <RobotSVG parts={robot.parts} colors={robot.colors} size={160} fx={fx} />
            </div>

            <div className="mt-2 text-center font-semibold text-lg text-white">{robot.name}</div>

            {/* HP Bar */}
            <div className="w-full mt-4 bg-panel/80 h-4 rounded-full overflow-hidden border border-white/20 relative">
                <motion.div
                    className={`h-full ${isPlayer ? 'bg-gradient-to-r from-neon-cyan to-blue-600' : 'bg-gradient-to-r from-neon-pink to-red-600'}`}
                    animate={{ width: `${hpPercent}%` }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                />
            </div>
            <div className={`text-right text-xs font-mono mt-1 font-semibold ${isPlayer ? 'text-neon-cyan' : 'text-neon-pink'}`}>
                HP: <span className="text-white text-lg font-orbitron">{Math.floor(currentHp ?? 0)}</span> / {robot.baseHp}
            </div>

            {/* Popups */}
            <AnimatePresence>
                {popups.map((p: any) => (
                    <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 0, scale: 0.5 }}
                        animate={{ opacity: 1, y: -80, scale: p.type === 'crit' ? 2 : 1.5 }}
                        exit={{ opacity: 0, scale: 0 }}
                        className={`absolute top-1/2 left-1/2 -translate-x-1/2 z-50 font-black italic text-shadow-black
                            ${p.type === 'crit' ? 'text-yellow-400 text-6xl' : (p.type === 'miss' ? 'text-gray-400 text-5xl' : 'text-white text-5xl')}
                        `}
                    >
                        {p.text}
                        {p.type === 'crit' && <div className="text-sm text-center">CRITICAL!</div>}
                    </motion.div>
                ))}
            </AnimatePresence>
        </motion.div>
    );
}
