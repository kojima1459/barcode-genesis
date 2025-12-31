import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BattleResult, RobotData } from "@/types/shared";
import { BattleEvent, generateBattleEvents } from "@/lib/battleReplay";
import RobotSVG from "@/components/RobotSVG";
import { useSound } from "@/contexts/SoundContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRobotFx } from "@/hooks/useRobotFx";
import { CountUp } from "@/components/ui/CountUp";
import { Button } from "@/components/ui/button";
import ShareButton from "@/components/ShareButton";
import { Zap, Volume2, VolumeX } from "lucide-react";
import { playGenerated, setMuted as setGlobalMuted, getMuted } from "@/lib/sound";
import { AnimatedHPBar } from "@/components/AnimatedHPBar";
import { VictoryEffect, DefeatEffect } from "@/components/BattleResultEffects";
import { useScreenShake } from "@/hooks/useScreenShake";

// Confetti Component
const Confetti = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-40">
        {Array.from({ length: 50 }).map((_, i) => (
            <div
                key={i}
                className="absolute w-2 h-2 rounded-full animate-pulse"
                style={{
                    left: `${Math.random() * 100}%`,
                    top: `-10px`,
                    animation: `fall ${2 + Math.random() * 3}s linear infinite`,
                    animationDelay: `${Math.random() * 2}s`,
                    backgroundColor: ['#00f3ff', '#ff0055', '#ffff00'][Math.floor(Math.random() * 3)]
                }}
            />
        ))}
        <style>{`
            @keyframes fall {
                to { transform: translateY(100vh) rotate(360deg); }
            }
        `}</style>
    </div>
);

interface BattleReplayProps {
    p1: RobotData;
    p2: RobotData;
    result: BattleResult;
    onComplete: () => void;
}

export default function BattleReplay({ p1, p2, result, onComplete }: BattleReplayProps) {
    const { playSE, playBGM } = useSound();
    const { t } = useLanguage();
    const { fx } = useRobotFx();
    const { shake, shakeStyle } = useScreenShake();

    // Sound
    const [isMuted, setIsMuted] = useState(() => getMuted());

    const [events, setEvents] = useState<BattleEvent[]>([]);
    const [currentEventIndex, setCurrentEventIndex] = useState(0);

    // Game State
    const [hp, setHp] = useState<Record<string, number>>({ [p1.id]: p1.baseHp, [p2.id]: p2.baseHp });
    const [activeMessage, setActiveMessage] = useState<string>("");
    const [isFinished, setIsFinished] = useState(false);

    // Visual States
    const [shakeId, setShakeId] = useState<string | null>(null);
    const [flashId, setFlashId] = useState<string | null>(null);
    const [popups, setPopups] = useState<{ id: string, text: string, type: 'damage' | 'crit' | 'miss', targetId: string }[]>([]);
    const [lungeId, setLungeId] = useState<string | null>(null);

    // NEW: Critical Slow-mo state
    const [isCriticalMoment, setIsCriticalMoment] = useState(false);

    // Pacing
    const [speed, setSpeed] = useState<1 | 2 | 3>(1);
    const [isSkipped, setIsSkipped] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hasEndedRef = useRef(false);

    // NEW: Battle HUD State
    const [currentTurn, setCurrentTurn] = useState(1);
    const [currentAttackerId, setCurrentAttackerId] = useState<string | null>(null);
    const [highlightMessages, setHighlightMessages] = useState<string[]>([]);
    const [flashP1, setFlashP1] = useState(false);
    const [flashP2, setFlashP2] = useState(false);
    const [showResultsOnly, setShowResultsOnly] = useState(false);
    const [lastHp, setLastHp] = useState<Record<string, number>>({ [p1.id]: p1.baseHp, [p2.id]: p2.baseHp });

    // Initial Setup
    useEffect(() => {
        const generated = generateBattleEvents(result.logs, p1.id, p2.id);
        setEvents(generated);
        setCurrentEventIndex(0);
        setHp({ [p1.id]: p1.baseHp, [p2.id]: p2.baseHp });

        playBGM('bgm_battle');
        if (!isMuted) playGenerated('ui_click');
    }, [result, p1.id, p2.id]);

    const handleMuteToggle = () => {
        const next = !isMuted;
        setIsMuted(next);
        setGlobalMuted(next);
        playGenerated('ui_click');
    };

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

        // Critical Hit Slow-mo Logic
        if (event.type === 'ATTACK_IMPACT' && event.isCritical && !isSkipped) {
            delay *= 3; // 3x duration for impact
            setIsCriticalMoment(true);
            setTimeout(() => setIsCriticalMoment(false), delay);
        }

        if (isSkipped) delay = 20;

        const execute = () => {
            // Process Event Side Effects
            switch (event.type) {
                case 'LOG_MESSAGE':
                    if (event.message) {
                        setActiveMessage(event.message);
                        if (isHighlightLog(event.message)) {
                            setHighlightMessages(prev => [...prev, event.message!].slice(-5));
                        }
                    }
                    break;
                case 'ATTACK_PREPARE':
                    if (event.attackerId) {
                        setLungeId(event.attackerId);
                        setCurrentAttackerId(event.attackerId);
                        setTimeout(() => setLungeId(null), 200 / speed);
                    }
                    break;
                case 'ATTACK_IMPACT':
                    if (event.defenderId) {
                        // Shake
                        setShakeId(event.defenderId);
                        setTimeout(() => setShakeId(null), 300 / speed);

                        // Screen shake for heavy hits
                        if (event.isCritical) {
                            shake({ intensity: 'heavy', duration: 300 });
                        } else if (!event.isMiss) {
                            shake({ intensity: 'light', duration: 200 });
                        }

                        // Sound
                        if (event.isMiss) {
                            // miss sound
                        } else if (event.isCritical) {
                            playGenerated('hit_heavy'); // Code-generated crit sound
                        } else {
                            playGenerated('hit_light'); // Code-generated hit sound
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
                        // Flash HP bar if decreased
                        if (event.currentHp[p1.id] < (lastHp[p1.id] ?? p1.baseHp)) {
                            setFlashP1(true);
                            setTimeout(() => setFlashP1(false), 300);
                        }
                        if (event.currentHp[p2.id] < (lastHp[p2.id] ?? p2.baseHp)) {
                            setFlashP2(true);
                            setTimeout(() => setFlashP2(false), 300);
                        }
                        setLastHp(event.currentHp);
                        setHp(prev => ({ ...prev, ...event.currentHp }));
                    }
                    break;
                case 'PHASE_START':
                    setCurrentTurn(prev => prev + 1);
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
        if (isWin) {
            playGenerated('win');
        } else {
            playGenerated('lose');
        }
        setIsFinished(true);
    };

    const handleSkip = () => {
        setIsSkipped(true);
        playGenerated('ui_skip');
    };

    // NEW: Check if log should be highlighted
    const isHighlightLog = (message: string): boolean => {
        if (!message) return false;
        if (message.includes('クリティカル') || message.includes('CRITICAL') || message.includes('会心')) return true;
        if (message.includes('応援') || message.includes('cheer') || message.includes('Cheer')) return true;
        if (message.includes('撃破') || message.includes('KO') || message.includes('defeated') || message.includes('倒れた')) return true;
        if (message.includes('必殺') || message.includes('SPECIAL') || message.includes('Special')) return true;
        return false;
    };

    // NEW: Results Only - Jump to end
    const handleResultsOnly = () => {
        setShowResultsOnly(true);
        setIsSkipped(true);
        playGenerated('ui_skip');

        // Extract final HP from last event
        const lastEvent = events[events.length - 1];
        if (lastEvent?.currentHp) {
            setHp(lastEvent.currentHp);
        }

        // Show only highlight messages
        const highlights = result.logs
            .map(log => log.message)
            .filter(msg => msg && isHighlightLog(msg));
        setHighlightMessages(highlights);

        // Jump to end
        setCurrentEventIndex(events.length);
    };

    // Helper for visual calculation
    const getHpPercent = (id: string, max: number) => {
        const current = hp[id] ?? max;
        return Math.max(0, Math.min(100, (current / max) * 100));
    };

    return (
        <div className={`space-y-8 relative py-8 w-full transition-all duration-200 ${isCriticalMoment ? 'grayscale-[0.5] scale-[1.02]' : ''}`} style={shakeStyle}>
            {/* Visual Overlays */}
            {isFinished && result.winnerId === p1.id && <VictoryEffect />}
            {isFinished && result.winnerId !== p1.id && <DefeatEffect />}

            {/* NEW: Fixed Battle HUD */}
            {!isFinished && (
                <div className="fixed top-0 left-0 right-0 bg-black/95 backdrop-blur-sm z-50 border-b border-white/10">
                    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2 sm:py-3 relative">
                        {/* Mute Toggle */}
                        <button
                            onClick={handleMuteToggle}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors p-2"
                        >
                            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        </button>
                        {/* Turn & Phase */}
                        <div className="text-center mb-2 text-xs sm:text-sm">
                            <span className="text-neon-cyan font-bold font-orbitron">TURN {Math.floor(currentTurn / 6)}</span>
                            <span className="ml-2 sm:ml-4 text-[10px] sm:text-xs text-gray-400">
                                {currentAttackerId === p1.id ? "P1 ATTACKING" : currentAttackerId === p2.id ? "P2 ATTACKING" : "STANDBY"}
                            </span>
                        </div>

                        {/* HP Bars */}
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-stretch sm:items-center">
                            {/* P1 HP */}
                            <div className="flex-1">
                                <AnimatedHPBar
                                    current={hp[p1.id] ?? p1.baseHp}
                                    max={p1.baseHp}
                                    label={p1.name}
                                    showNumbers={true}
                                    onCriticalDamage={() => shake({ intensity: 'medium', duration: 300 })}
                                />
                            </div>

                            {/* VS Divider */}
                            <div className="hidden sm:block text-base sm:text-xl font-bold text-white/30 px-1">VS</div>

                            {/* P2 HP */}
                            <div className="flex-1">
                                <AnimatedHPBar
                                    current={hp[p2.id] ?? p2.baseHp}
                                    max={p2.baseHp}
                                    label={p2.name}
                                    showNumbers={true}
                                    onCriticalDamage={() => shake({ intensity: 'medium', duration: 300 })}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Spacer for fixed HUD */}
            {!isFinished && <div className="h-20 sm:h-24" />}

            {/* NEW: Improved Pacing Controls */}
            {!isFinished && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 flex flex-wrap gap-1 sm:gap-2 px-3 py-2 rounded-full glass-panel border border-white/10 shadow-lg">
                    {/* Speed Control */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setSpeed(1); playGenerated('ui_click'); }}
                        className={`text-[10px] sm:text-xs font-bold h-7 sm:h-8 px-2 sm:px-3 ${speed === 1 ? "text-neon-cyan bg-neon-cyan/10" : "text-white/70 hover:text-white"}`}
                    >
                        1x
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setSpeed(2); playGenerated('ui_click'); }}
                        className={`text-[10px] sm:text-xs font-bold h-7 sm:h-8 px-2 sm:px-3 ${speed === 2 ? "text-neon-cyan bg-neon-cyan/10" : "text-white/70 hover:text-white"}`}
                    >
                        2x
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setSpeed(3); playGenerated('ui_click'); }}
                        className={`text-[10px] sm:text-xs font-bold h-7 sm:h-8 px-2 sm:px-3 ${speed === 3 ? "text-neon-cyan bg-neon-cyan/10" : "text-white/70 hover:text-white"}`}
                    >
                        3x
                    </Button>
                    <div className="w-px h-6 bg-white/20 self-center hidden sm:block" />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSkip}
                        className="text-[10px] sm:text-xs font-bold h-7 sm:h-8 px-2 sm:px-3 text-yellow-400 hover:text-yellow-300"
                    >
                        SKIP ⏭
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResultsOnly}
                        className="text-[10px] sm:text-xs font-bold h-7 sm:h-8 px-2 sm:px-3 text-white/70 hover:text-white"
                    >
                        結果だけ見る
                    </Button>
                </div>
            )}

            <div className={`flex flex-col md:flex-row justify-between items-center gap-8 relative z-10 w-full transition-all duration-300 ${isFinished ? 'blur-[2px] scale-95 opacity-80' : ''}`}>
                {/* P1 Cards */}
                <div className={shakeId === p1.id ? 'shake-strong' : ''}>
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
                </div>

                <div className="text-5xl font-black text-white/10 italic relative z-0 md:absolute md:left-1/2 md:-translate-x-1/2">
                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 text-9xl opacity-10 blur-sm pointer-events-none">VS</span>
                    VS
                </div>

                {/* P2 Cards */}
                <div className={shakeId === p2.id ? 'shake-strong' : ''}>
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
            </div>

            {/* NEW: Battle Logs - Highlight + Accordion */}
            <div className={`mt-4 sm:mt-8 space-y-2 transition-opacity ${isFinished ? 'opacity-0' : 'opacity-100'}`}>
                {/* Highlight Messages */}
                {highlightMessages.length > 0 && (
                    <div className="max-h-16 sm:max-h-24 overflow-y-auto space-y-1 px-2">
                        {highlightMessages.map((msg, i) => (
                            <div key={i} className="text-[10px] sm:text-sm font-bold text-yellow-400 bg-black/80 px-2 py-1 rounded border border-yellow-500/30 animate-pulse">
                                ★ {msg}
                            </div>
                        ))}
                    </div>
                )}

                {/* Current Message (if not highlight) */}
                {!isHighlightLog(activeMessage) && activeMessage && (
                    <div className="glass-panel p-3 sm:p-4 rounded-xl text-xs sm:text-sm font-mono flex items-center justify-center">
                        <div className="text-center font-semibold">{activeMessage}</div>
                    </div>
                )}

                {/* Full Log Accordion */}
                <details className="glass-panel rounded-lg overflow-hidden">
                    <summary className="cursor-pointer text-[10px] sm:text-xs text-gray-400 hover:text-white px-3 py-2 bg-black/40 hover:bg-black/60 transition-colors">
                        全ログを表示 ({result.logs.length} ターン)
                    </summary>
                    <div className="mt-1 max-h-32 sm:max-h-40 overflow-y-auto text-[9px] sm:text-xs text-gray-300 space-y-0.5 p-2 bg-black/20">
                        {result.logs.map((log, i) => (
                            <div key={i} className={`${i === Math.floor(currentEventIndex / 6) ? "text-yellow-400 font-bold" : ""} font-mono`}>
                                <span className="text-gray-500">[T{log.turn}]</span> {log.message}
                            </div>
                        ))}
                    </div>
                </details>
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
                                {result.winnerId === p1.id ? t('victory').toUpperCase() : t('defeat').toUpperCase()}
                            </h2>

                            {result.winnerId === p1.id && (
                                <div className="text-yellow-400 font-bold text-xl flex flex-col items-center gap-2 bg-black/40 p-4 rounded border border-yellow-500/30">
                                    <div className="flex items-center gap-2">
                                        <Zap className="w-5 h-5 text-yellow-400" />
                                        <span>
                                            Gets: <CountUp value={result.rewards.credits ?? 0} prefix="+" suffix=" cr" /> / <CountUp value={result.rewards.exp ?? 0} prefix="+" suffix=" XP" />
                                        </span>
                                    </div>
                                    {/* Robot Level Up Notification */}
                                    {result.rewards.robotLevelUp && (
                                        <div className="mt-2 text-neon-cyan font-black text-lg animate-bounce drop-shadow-[0_0_5px_rgba(0,243,255,0.8)]">
                                            ROBOT LEVEL UP! Lv.{result.rewards.robotLevel}
                                        </div>
                                    )}
                                    {!result.rewards.robotLevelUp && result.rewards.robotXpEarned && (
                                        <div className="mt-1 text-sm text-gray-400">
                                            Robot XP +{result.rewards.robotXpEarned}
                                        </div>
                                    )}
                                </div>
                            )}

                            <Button size="lg" onClick={onComplete} className="w-full bg-neon-cyan text-black hover:bg-white font-bold h-12 text-lg">
                                {t('continue_button').toUpperCase()}
                            </Button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function RobotCard({ robot, hpPercent, currentHp, isShaking, isLunging, isPlayer, fx, popups }: any) {
    const { t } = useLanguage();
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
                {isPlayer ? t('player_label').toUpperCase() : t('opponent_label').toUpperCase()}
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
