import { useEffect, useState, useRef, useMemo, memo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { BattleResult, RobotData } from "@/types/shared";
import { BattleEvent, generateBattleEvents } from "@/lib/battleReplay";
import RobotSVG from "@/components/RobotSVG";
import { useSound } from "@/contexts/SoundContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRobotFx } from "@/hooks/useRobotFx";
import { CountUp } from "@/components/ui/CountUp";
import { Button } from "@/components/ui/button";
import Interactive from "@/components/ui/interactive";
import ShareButton from "@/components/ShareButton";
import { Zap, Volume2, VolumeX } from "lucide-react";
import { playGenerated, setMuted as setGlobalMuted, getMuted } from "@/lib/sound";
import { AnimatedHPBar } from "@/components/AnimatedHPBar";
import { VictoryEffect, DefeatEffect } from "@/components/BattleResultEffects";
import { useScreenShake } from "@/hooks/useScreenShake";
import { EnhancedDamageNumber } from "@/components/EnhancedDamageNumber";
import { playSfx, setMuted as setSfxMuted, getMuted as getSfxMuted } from "@/lib/sfx";
import { PLAY_STEP_MS, IMPORTANT_EVENT_BONUS_MS, getImpactIntensity, isImportantLog } from "@/lib/battleFx";
import SpecialCutIn from "@/components/SpecialCutIn";
import BattleHUDExtended from "@/components/BattleHUDExtended";

// Deterministic PRNG based on LCG (Linear Congruential Generator)
const createPRNG = (seed: string) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
    }
    let state = hash || 123456789;
    return () => {
        state = (state * 1664525 + 1013904223) | 0;
        return (state >>> 0) / 4294967296;
    };
};

// Memoized Confetti for performance and determinism
const Confetti = memo(({ seed }: { seed: string }) => {
    const prng = useMemo(() => createPRNG(seed), [seed]);
    const particles = useMemo(() => Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        left: `${prng() * 100}%`,
        duration: 2 + prng() * 3,
        delay: prng() * 2,
        color: ['#00f3ff', '#ff0055', '#ffff00'][Math.floor(prng() * 3)]
    })), [prng]);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-40">
            {particles.map((p) => (
                <div
                    key={p.id}
                    className="absolute w-2 h-2 rounded-full animate-pulse"
                    style={{
                        left: p.left,
                        top: `-10px`,
                        animation: `fall ${p.duration}s linear infinite`,
                        animationDelay: `${p.delay}s`,
                        backgroundColor: p.color
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
});
Confetti.displayName = 'Confetti';

interface BattleReplayProps {
    p1: RobotData;
    p2: RobotData;
    result: BattleResult;
    onComplete: () => void;
    initialSpeed?: 1 | 2 | 3;
    p1OverdriveGauge?: number;
    p2OverdriveGauge?: number;
    // New prop to control result overlay visibility
    showResultOverlay?: boolean;
}

export default function BattleReplay({ p1, p2, result, onComplete, initialSpeed = 1, showResultOverlay = true, p1OverdriveGauge: initialP1Overdrive = 0, p2OverdriveGauge: initialP2Overdrive = 0 }: BattleReplayProps) {
    const { playSE, playBGM } = useSound();
    const { t } = useLanguage();
    const { fx } = useRobotFx();
    const { shake, shakeStyle } = useScreenShake();

    // Sound - sync with both old and new systems
    const [isMuted, setIsMuted] = useState(() => getMuted() || getSfxMuted());

    const [events, setEvents] = useState<BattleEvent[]>([]);
    const [currentEventIndex, setCurrentEventIndex] = useState(0);

    // Game State - use safe defaults (use optional chaining for safety)
    const [hp, setHp] = useState<Record<string, number>>({
        [p1?.id ?? 'p1']: p1?.baseHp ?? 1000,
        [p2?.id ?? 'p2']: p2?.baseHp ?? 1000
    });
    const [activeMessage, setActiveMessage] = useState<string>("");
    const [isFinished, setIsFinished] = useState(false);

    // Visual States
    const [shakeId, setShakeId] = useState<string | null>(null);
    const [flashId, setFlashId] = useState<string | null>(null);
    const [popups, setPopups] = useState<{ id: string, value: number, isCritical: boolean, isDodge: boolean, cheerApplied?: boolean, x: number, y: number, targetId: string }[]>([]);
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
    const [lastHp, setLastHp] = useState<Record<string, number>>({ [p1?.id ?? 'p1']: p1?.baseHp ?? 1000, [p2?.id ?? 'p2']: p2?.baseHp ?? 1000 });

    // Extended HUD State
    const [currentEvent, setCurrentEvent] = useState<BattleEvent | null>(null);
    const [p1OverdriveGauge, setP1OverdriveGauge] = useState(0);
    const [p2OverdriveGauge, setP2OverdriveGauge] = useState(0);

    // SpecialCutIn State
    const [showCutIn, setShowCutIn] = useState(false);
    const [cutInData, setCutInData] = useState<{
        robotName?: string;
        overdriveTriggered?: boolean;
        overdriveMessage?: string;
        specialTriggered?: boolean;
        specialName?: string;
        specialRoleName?: string;
        specialImpact?: string;
        specialHits?: number;
    }>({});
    const prefersReducedMotion = useReducedMotion();
    const [showSpecialOverlay, setShowSpecialOverlay] = useState(false);
    const [replayError, setReplayError] = useState<string | null>(null);
    const [pauseTick, setPauseTick] = useState(0);
    const [devCrashNotice, setDevCrashNotice] = useState<string | null>(null);
    const specialOverlayIndexRef = useRef<number | null>(null);
    const specialOverlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pauseUntilRef = useRef(0);
    const audioContextRef = useRef<AudioContext | null>(null);
    const mountedRef = useRef(true);
    const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
    const devCrashTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // HUD helper state
    const [lastDamage, setLastDamage] = useState(0);
    const [lastDamageTargetId, setLastDamageTargetId] = useState<string | null>(null);

    // Memoized filtered popups (must be before any conditional returns)
    const p1Popups = useMemo(() => p1?.id ? popups.filter(p => p.targetId === p1.id) : [], [popups, p1?.id]);
    const p2Popups = useMemo(() => p2?.id ? popups.filter(p => p.targetId === p2.id) : [], [popups, p2?.id]);

    // Defensive check: ensure p1 and p2 are valid (computed flag, NOT early return)
    const isInvalidProps = !p1 || !p2 || !p1.id || !p2.id;

    // Log once if invalid
    useEffect(() => {
        if (isInvalidProps) {
            console.error('[BattleReplay] Invalid props:', { p1, p2 });
        }
    }, [isInvalidProps, p1, p2]);

    // Initial Setup
    useEffect(() => {
        if (!mountedRef.current) return;
        const generated = generateBattleEvents(result.logs, p1.id, p2.id);

        // FEATURE: Ensure at least one Special Cut-in per battle for excitement
        const hasSpecial = generated.some(e => e.specialTriggered || e.overdriveTriggered);
        if (!hasSpecial && generated.length > 5) {
            // Find a suitable moment (Turn 3+ hit)
            const climaxIdx = generated.findIndex(e =>
                e.type === 'ATTACK_IMPACT' &&
                !e.isMiss &&
                e.turn && e.turn >= 3 &&
                (e.isCritical || (e.damage && e.damage > 50))
            );

            if (climaxIdx !== -1) {
                const targetEvent = generated[climaxIdx];
                const isP1 = targetEvent.attackerId === p1.id;
                const robotHeight = isP1 ? p1.stats?.height : p2.stats?.height;
                const robotWeight = isP1 ? p1.stats?.weight : p2.stats?.weight;

                // Inject Fake Special
                generated.splice(climaxIdx, 0, {
                    type: 'SPECIAL_CUT_IN',
                    attackerId: targetEvent.attackerId,
                    defenderId: targetEvent.defenderId,
                    specialTriggered: true,
                    specialName: "LIMIT BREAK", // Generic cool name
                    specialRoleName: "OVERDRIVE",
                    specialImpact: 'heavy',
                    delay: 1500
                });

                // Upgrade the impact event log type
                const impactEvent = generated[climaxIdx + 1];
                if (impactEvent) {
                    impactEvent.specialTriggered = true; // For shake effect
                    impactEvent.logType = 'CLIMAX'; // For slow-mo
                }
            }
        }

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
        setSfxMuted(next);
        if (!next) playSfx('ui');
    };

    const scheduleTimeout = (callback: () => void, ms: number) => {
        const id = setTimeout(() => {
            if (!mountedRef.current) return;
            callback();
        }, ms);
        timeoutsRef.current.push(id);
        return id;
    };

    const showDevCrash = (message: string) => {
        if (!import.meta.env.DEV) return;
        if (!mountedRef.current) return;
        setDevCrashNotice(message);
        if (devCrashTimeoutRef.current) {
            clearTimeout(devCrashTimeoutRef.current);
        }
        devCrashTimeoutRef.current = scheduleTimeout(() => setDevCrashNotice(null), 3000);
    };

    const isImportantEvent = (event: BattleEvent) => Boolean(
        event.specialTriggered ||
        event.overdriveTriggered ||
        event.isCritical ||
        event.finisherApplied ||
        event.bossShieldBroken ||
        event.stunApplied ||
        event.stunned ||
        event.cheerApplied
    );

    const handleReplayError = (error: unknown) => {
        console.error("[BattleReplay] Replay error:", error);
        if (!mountedRef.current) return;
        hasEndedRef.current = true;
        setReplayError("Replay error");
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (specialOverlayTimeoutRef.current) clearTimeout(specialOverlayTimeoutRef.current);
        timeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
        timeoutsRef.current = [];
    };

    // Cleanup
    useEffect(() => {
        return () => {
            mountedRef.current = false;
            timeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
            timeoutsRef.current = [];
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (specialOverlayTimeoutRef.current) clearTimeout(specialOverlayTimeoutRef.current);
            if (devCrashTimeoutRef.current) clearTimeout(devCrashTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        if (!import.meta.env.DEV || typeof window === "undefined") return;

        const prevOnError = window.onerror;
        const prevOnRejection = window.onunhandledrejection;

        window.onerror = (message, source, lineno, colno, error) => {
            console.error(
                "[DEV_CRASH] window.onerror",
                error?.stack || message,
                source,
                lineno,
                colno
            );
            showDevCrash("DEV crash captured (onerror)");
            if (typeof prevOnError === "function") {
                return prevOnError(message, source, lineno, colno, error);
            }
            return false;
        };

        window.onunhandledrejection = (event) => {
            const reason = event?.reason;
            const message = reason instanceof Error ? reason.message : String(reason);
            const stack = reason instanceof Error ? reason.stack : undefined;
            console.error("[DEV_CRASH] unhandledrejection", message, stack);
            showDevCrash("DEV crash captured (unhandledrejection)");
            if (typeof prevOnRejection === "function") {
                return prevOnRejection(event);
            }
            return undefined;
        };

        return () => {
            window.onerror = prevOnError;
            window.onunhandledrejection = prevOnRejection;
        };
    }, []);

    // Event Loop
    useEffect(() => {
        if (events.length === 0) return;
        if (hasEndedRef.current) return;
        if (replayError) return;

        if (currentEventIndex >= events.length) {
            handleBattleEnd();
            return;
        }

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        const pauseRemaining = Math.max(0, pauseUntilRef.current - Date.now());
        if (pauseRemaining > 0) {
            timeoutRef.current = scheduleTimeout(() => {
                setPauseTick((prev) => prev + 1);
            }, pauseRemaining);
            return;
        }

        const event = events[currentEventIndex];

        if (!isSkipped && event.type === 'SPECIAL_CUT_IN') {
            if (specialOverlayIndexRef.current !== currentEventIndex) {
                specialOverlayIndexRef.current = currentEventIndex;
                if (!mountedRef.current) return;
                setShowSpecialOverlay(true);
                if (specialOverlayTimeoutRef.current) {
                    clearTimeout(specialOverlayTimeoutRef.current);
                }
                pauseUntilRef.current = Date.now() + 600;
                specialOverlayTimeoutRef.current = scheduleTimeout(() => {
                    if (!mountedRef.current) return;
                    setShowSpecialOverlay(false);
                    pauseUntilRef.current = 0;
                }, 600);
            }
        }

        let delay = (event.delay || 0) / speed;
        if (!isSkipped) {
            if (event.logType === 'NORMAL') {
                delay *= 0.55; // Faster normal hits
            }
            if (isImportantEvent(event)) {
                delay = Math.max(delay, 500);
            }
        }

        // Critical Hit Slow-mo Logic
        if (event.type === 'ATTACK_IMPACT' && (event.isCritical || event.specialTriggered) && !isSkipped) {
            delay *= 2.5; // Slow-mo for impact
            if (!mountedRef.current) return;
            setIsCriticalMoment(true);
            scheduleTimeout(() => setIsCriticalMoment(false), delay);
        }

        if (isSkipped) delay = 20;
        delay = Math.max(delay, 20);

        const execute = () => {
            try {
                if (!mountedRef.current) return;
                // Update current event for HUD
                setCurrentEvent(event);

                // Process Event Side Effects
                switch (event.type) {
                    case 'SPECIAL_CUT_IN': {
                        // Show cut-in overlay
                        const attackerRobot = event.attackerId === p1.id ? p1 : p2;
                        setCutInData({
                            robotName: attackerRobot.name,
                            overdriveTriggered: event.overdriveTriggered,
                            overdriveMessage: event.overdriveMessage,
                            specialTriggered: event.specialTriggered,
                            specialName: event.specialName,
                            specialRoleName: event.specialRoleName,
                            specialImpact: event.specialImpact,
                            specialHits: event.specialHits
                        });
                        setShowCutIn(true);
                        // Play special SFX
                        playSfx('ult');
                        shake({ intensity: 'medium', duration: 400 });
                        // Auto-hide after delay
                        scheduleTimeout(() => setShowCutIn(false), (event.delay || 650) / speed);
                        break;
                    }

                    case 'LOG_MESSAGE':
                        if (event.message) {
                            const isHighlight = event.logType === 'HIGHLIGHT' || event.logType === 'CLIMAX' || isHighlightLog(event.message);
                            if (isHighlight) {
                                setActiveMessage(event.message);
                                setHighlightMessages(prev => [...prev, event.message!].slice(-5));
                            }
                        }
                        if (event.attackerId) {
                            setCurrentAttackerId(event.attackerId);
                        }
                        // Update overdrive gauges from LOG_MESSAGE events
                        if (event.attackerOverdriveGauge !== undefined) {
                            if (event.attackerId === p1.id) {
                                setP1OverdriveGauge(event.attackerOverdriveGauge);
                            } else {
                                setP2OverdriveGauge(event.attackerOverdriveGauge);
                            }
                        }
                        if (event.defenderOverdriveGauge !== undefined) {
                            if (event.defenderId === p1.id) {
                                setP1OverdriveGauge(event.defenderOverdriveGauge);
                            } else {
                                setP2OverdriveGauge(event.defenderOverdriveGauge);
                            }
                        }
                        break;

                    case 'ATTACK_PREPARE':
                        if (event.attackerId) {
                            setLungeId(event.attackerId);
                            setCurrentAttackerId(event.attackerId);
                            scheduleTimeout(() => setLungeId(null), 140 / speed);
                            playSfx('attack', { volume: 0.5 });
                        }
                        break;

                    case 'ATTACK_IMPACT':
                        if (event.defenderId) {
                            setShakeId(event.defenderId);
                            scheduleTimeout(() => setShakeId(null), 300 / speed);

                            // Enhanced shake for special/overdrive
                            if (event.specialTriggered || event.overdriveTriggered) {
                                shake({ intensity: 'heavy', duration: 400 });
                            } else if (event.isCritical) {
                                shake({ intensity: 'heavy', duration: 300 });
                            } else if (!event.isMiss) {
                                shake({ intensity: 'light', duration: 200 });
                            }

                            if (event.isMiss) {
                                // Miss SFX - reuse UI click or similar if no dedicated miss
                                playSfx('guard', { volume: 0.5, playbackRate: 2.0 });
                            } else if (event.specialTriggered || event.overdriveTriggered) {
                                playSfx('ult', { volume: 0.8 });
                            } else if (event.isCritical) {
                                playSfx('crit', { volume: 0.7 });
                            } else {
                                playSfx('hit', { volume: 0.6 });
                            }

                            if (event.cheerApplied) {
                                scheduleTimeout(() => playSfx('cheer', { volume: 0.6 }), 100);
                            }
                        }
                        break;

                    case 'DAMAGE_POPUP':
                        if (event.defenderId) {
                            const popupId = `popup-${currentEventIndex}-${Date.now()}`;
                            const value = event.damage || 0;
                            const isCritical = Boolean(event.isCritical) || Boolean(event.specialTriggered);
                            const isDodge = Boolean(event.isMiss);

                            setPopups(prev => [...prev.slice(-4), {
                                id: popupId,
                                value,
                                isCritical,
                                isDodge,
                                cheerApplied: event.cheerApplied,
                                x: 40 + ((currentEventIndex * 17) % 20),
                                y: 30 + ((currentEventIndex * 13) % 20),
                                targetId: event.defenderId!
                            }]);
                            setLastDamage(value);
                            setLastDamageTargetId(event.defenderId);
                            scheduleTimeout(() => {
                                setPopups(prev => prev.filter(p => p.id !== popupId));
                            }, 900);
                        }
                        break;

                    case 'HP_UPDATE':
                        if (event.currentHp) {
                            if (event.currentHp[p1.id] < (lastHp[p1.id] ?? p1.baseHp)) {
                                setFlashP1(true);
                                scheduleTimeout(() => setFlashP1(false), 300);
                            }
                            if (event.currentHp[p2.id] < (lastHp[p2.id] ?? p2.baseHp)) {
                                setFlashP2(true);
                                scheduleTimeout(() => setFlashP2(false), 300);
                            }
                            setLastHp(event.currentHp);
                            setHp(prev => ({ ...prev, ...event.currentHp }));
                        }
                        // Also update gauges from HP_UPDATE
                        if (event.attackerOverdriveGauge !== undefined && event.attackerId) {
                            if (event.attackerId === p1.id) {
                                setP1OverdriveGauge(event.attackerOverdriveGauge);
                            } else {
                                setP2OverdriveGauge(event.attackerOverdriveGauge);
                            }
                        }
                        if (event.defenderOverdriveGauge !== undefined && event.defenderId) {
                            if (event.defenderId === p1.id) {
                                setP1OverdriveGauge(event.defenderOverdriveGauge);
                            } else {
                                setP2OverdriveGauge(event.defenderOverdriveGauge);
                            }
                        }
                        break;

                    case 'PHASE_START':
                        if (event.turn) setCurrentTurn(event.turn);
                        break;
                }

                // Next event
                setCurrentEventIndex(prev => prev + 1);
            } catch (error) {
                handleReplayError(error);
            }
        };

        timeoutRef.current = scheduleTimeout(execute, delay);
    }, [currentEventIndex, events, speed, isSkipped, showSpecialOverlay, replayError, pauseTick]);


    const handleBattleEnd = () => {
        if (hasEndedRef.current) return;
        if (!mountedRef.current) return;
        hasEndedRef.current = true;

        const isWin = result.winnerId === p1.id;
        // Play victory/defeat SFX
        if (isWin) {
            playSfx('win', { volume: 0.8 });
        } else {
            playSfx('lose', { volume: 0.7 });
        }
        setIsFinished(true);
    };

    const handleSkip = () => {
        if (!mountedRef.current) return;
        setIsSkipped(true);
        if (specialOverlayTimeoutRef.current) {
            clearTimeout(specialOverlayTimeoutRef.current);
        }
        setShowSpecialOverlay(false);
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
        if (!mountedRef.current) return;
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

    const nextHitKills = lastDamageTargetId === p2?.id && lastDamage > 0
        && lastDamage >= (hp[p2?.id ?? 'p2'] ?? p2?.baseHp ?? 1000);

    // Render invalid props error (after all hooks)
    if (isInvalidProps) {
        return (
            <div className="p-4 text-center text-red-400">
                <p>バトルデータの読み込みに失敗しました</p>
                <p className="text-xs text-gray-500 mt-2">Invalid battle data</p>
            </div>
        );
    }

    if (replayError) {
        return (
            <div className="glass-panel p-6 rounded-2xl border border-red-500/30 text-center space-y-4">
                <div className="text-sm font-bold text-red-400">Replay error.</div>
                <Button onClick={onComplete} className="bg-red-500 hover:bg-red-600 text-white">
                    Back to Battle
                </Button>
            </div>
        );
    }

    return (
        <div className={`space-y-8 relative py-8 w-full transition-all duration-200 ${isCriticalMoment ? 'grayscale-[0.5] scale-[1.02]' : ''}`} style={shakeStyle}>
            {/* Visual Overlays */}
            {isFinished && result.winnerId === p1.id && <VictoryEffect />}
            {isFinished && result.winnerId === p1.id && <Confetti seed={result.battleId || 'victory'} />}
            {isFinished && result.winnerId !== p1.id && <DefeatEffect />}

            {import.meta.env.DEV && devCrashNotice && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-red-900/80 text-white text-xs font-mono border border-red-500/40 shadow-lg">
                    {devCrashNotice}
                </div>
            )}

            {showSpecialOverlay && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm pointer-events-none">
                    <div className="px-10 py-6 rounded-2xl border border-white/20 bg-black/60 text-white text-4xl sm:text-5xl font-black tracking-[0.2em]">
                        SPECIAL
                    </div>
                </div>
            )}

            {/* Special/Overdrive Cut-In Overlay */}
            <SpecialCutIn
                show={showCutIn}
                robotName={cutInData.robotName}
                overdriveTriggered={cutInData.overdriveTriggered}
                overdriveMessage={cutInData.overdriveMessage}
                specialTriggered={cutInData.specialTriggered}
                specialName={cutInData.specialName}
                specialRoleName={cutInData.specialRoleName}
                specialImpact={cutInData.specialImpact}
                specialHits={cutInData.specialHits}
                onComplete={() => setShowCutIn(false)}
            />

            {/* NEW: Fixed Battle HUD */}
            {!isFinished && (
                <div className="fixed top-0 left-0 right-0 z-50">
                    {/* Glass Overlay */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xl border-b border-white/5" />
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-neon-cyan/30 to-transparent" />

                    <div className="max-w-4xl mx-auto px-4 py-3 relative">
                        {/* Mute Toggle */}
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <Interactive
                                onClick={handleMuteToggle}
                                className="text-white/40 hover:text-neon-cyan transition-colors p-2 rounded-lg border border-white/5 bg-black/20"
                            >
                                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                            </Interactive>
                        </div>

                        {/* Turn & Phase Indicator */}
                        <div className="flex items-center justify-center gap-6 mb-3">
                            <div className="bg-black/40 border border-white/5 px-4 py-0.5 rounded-full flex items-center gap-3">
                                <div className="text-[10px] font-black italic text-neon-cyan tracking-widest font-orbitron uppercase">
                                    Turn_{Math.floor(currentTurn / 6)}
                                </div>
                                <div className="w-px h-2 bg-white/20" />
                                <div className="text-[9px] font-mono text-muted-foreground uppercase flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
                                    {currentAttackerId === p1.id ? "P1_STRIKING" : currentAttackerId === p2.id ? "P2_STRIKING" : "SYSTEM_WAIT"}
                                </div>
                            </div>
                        </div>

                        {/* HP Bars - Premium Layout */}
                        <div className="flex gap-4 items-center">
                            {/* P1 HP */}
                            <div className="flex-1">
                                <AnimatedHPBar
                                    current={hp[p1.id] ?? p1.baseHp}
                                    max={p1.baseHp}
                                    label={p1.name}
                                    showNumbers={true}
                                    onCriticalDamage={() => shake({ intensity: 'medium', duration: 300 })}
                                    className="h-8"
                                />
                            </div>

                            {/* VS Badge */}
                            <div className="relative">
                                <div className="text-xs font-black italic text-white/20 font-orbitron">VS</div>
                                <div className="absolute inset-0 blur-sm text-xs font-black italic text-white/10 font-orbitron">VS</div>
                            </div>

                            {/* P2 HP */}
                            <div className="flex-1 text-right">
                                <AnimatedHPBar
                                    current={hp[p2.id] ?? p2.baseHp}
                                    max={p2.baseHp}
                                    label={p2.name}
                                    showNumbers={true}
                                    onCriticalDamage={() => shake({ intensity: 'medium', duration: 300 })}
                                    className="h-8"
                                />
                            </div>
                        </div>

                        {/* Extended HUD: Advantage, Stance, Gauges, Status */}
                        <BattleHUDExtended
                            p1Id={p1.id}
                            p2Id={p2.id}
                            p1Name={p1.name}
                            p2Name={p2.name}
                            p1MaxHp={p1.baseHp}
                            p2MaxHp={p2.baseHp}
                            currentHp={hp}
                            currentEvent={currentEvent}
                            p1OverdriveGauge={p1OverdriveGauge}
                            p2OverdriveGauge={p2OverdriveGauge}
                            nextHitKills={nextHitKills}
                        />
                    </div>
                </div>
            )}

            {/* Spacer for fixed HUD */}
            {!isFinished && <div className="h-20 sm:h-24" />}

            {/* NEW: Improved Pacing Controls */}
            {/* NEW: Improved Pacing Controls */}
            {!isFinished && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 px-4 py-2 rounded-2xl glass-panel border border-white/10 shadow-2xl">
                    <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                        {([1, 2, 3] as const).map(s => (
                            <Interactive
                                key={s}
                                onClick={() => { setSpeed(s); playGenerated('ui_click'); }}
                                className={`text-[10px] font-black italic h-8 px-3 rounded-lg transition-all ${speed === s ? "bg-primary text-black shadow-[0_0_10px_rgba(0,243,255,0.3)]" : "text-white/40 hover:text-white"
                                    }`}
                            >
                                {s}x
                            </Interactive>
                        ))}
                    </div>

                    <div className="w-px h-6 bg-white/10 mx-1" />

                    <Interactive
                        onClick={handleSkip}
                        className="text-[10px] font-black italic h-10 px-4 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500 hover:text-black transition-all"
                    >
                        FAST_FORWARD
                    </Interactive>

                    <Interactive
                        onClick={handleResultsOnly}
                        className="text-[10px] font-black italic h-10 px-4 rounded-xl bg-white/5 border border-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all font-mono"
                    >
                        SKIP_TO_RESULT
                    </Interactive>
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
                        popups={p1Popups}
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
                        popups={p2Popups}
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
                {isFinished && showResultOverlay && (
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

const RobotCard = memo(({ robot, hpPercent, currentHp, isShaking, isLunging, isPlayer, fx, popups }: any) => {
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
                <RobotSVG
                    parts={robot.parts}
                    colors={robot.colors}
                    size={160}
                    fx={fx}
                    role={typeof robot.role === 'string' ? robot.role : undefined}
                    rarityEffect={robot.rarityTier === 'legendary' ? 'legendary' : (robot.rarityTier === 'rare' ? 'rare' : undefined)}
                />
            </div>

            <div className="mt-2 text-center font-semibold text-lg text-white">{robot.name}</div>

            {/* HP Bar */}
            <div className="w-full mt-4 bg-panel/80 h-4 rounded-full overflow-hidden border border-white/20 relative">
                <motion.div
                    className={`h-full ${isPlayer ? 'bg-linear-to-r from-neon-cyan to-blue-600' : 'bg-linear-to-r from-neon-pink to-red-600'}`}
                    animate={{ width: `${hpPercent}%` }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                />
            </div>
            <div className={`text-right text-xs font-mono mt-1 font-semibold ${isPlayer ? 'text-neon-cyan' : 'text-neon-pink'} tabular-nums`}>
                HP: <span className="text-white text-lg font-orbitron">{Math.floor(currentHp ?? 0)}</span> / {robot.baseHp}
            </div>

            {/* Enhanced Damage Numbers */}
            <AnimatePresence>
                {popups.map((p: any) => (
                    <EnhancedDamageNumber
                        key={p.id}
                        value={p.value}
                        isCritical={p.isCritical}
                        isDodge={p.isDodge}
                        cheerApplied={p.cheerApplied}
                        x={p.x}
                        y={p.y}
                        onComplete={() => { }}
                    />
                ))}
            </AnimatePresence>
        </motion.div>
    );
});
RobotCard.displayName = 'RobotCard';
