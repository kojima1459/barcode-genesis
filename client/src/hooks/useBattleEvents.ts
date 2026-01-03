/**
 * useBattleEvents Hook
 * 
 * Manages the event-driven battle replay system.
 * Converts logs to events and handles playback timing.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { BattleLog, BattleResult } from '@/types/shared';
import { BattleEventBase, SEVERITY_DELAYS } from '@/types/battleEvents';
import { battleLogToEvents, createResultEvent } from '@/lib/battleLogToEvents';
import { playSfx, SfxName, unlockSfx } from '@/lib/sfx';

interface UseBattleEventsOptions {
    logs: BattleLog[];
    p1Id: string;
    p2Id: string;
    winnerId?: string;
    onEventChange?: (event: BattleEventBase | null, index: number) => void;
    onBattleEnd?: () => void;
}

interface UseBattleEventsReturn {
    /** All normalized events */
    events: BattleEventBase[];
    /** Current event index */
    currentIndex: number;
    /** Current event (null if finished) */
    currentEvent: BattleEventBase | null;
    /** Is replay finished */
    isFinished: boolean;
    /** Playback speed */
    speed: 1 | 2 | 3;
    /** Is skipped to end */
    isSkipped: boolean;
    /** Set playback speed */
    setSpeed: (speed: 1 | 2 | 3) => void;
    /** Skip to end */
    skip: () => void;
    /** Reset replay */
    reset: () => void;
}

export function useBattleEvents({
    logs,
    p1Id,
    p2Id,
    winnerId,
    onEventChange,
    onBattleEnd,
}: UseBattleEventsOptions): UseBattleEventsReturn {
    // Memoize event conversion - only recalculate when logs change
    const events = useMemo(() => {
        if (!logs || logs.length === 0) return [];

        const converted = battleLogToEvents(logs, { p1Id, p2Id });

        // Add RESULT event if we have a winner
        if (winnerId) {
            const lastTurn = logs[logs.length - 1]?.turn ?? logs.length;
            const isWin = winnerId === p1Id;
            converted.push(createResultEvent(isWin, lastTurn, converted.length));
        }

        return converted;
    }, [logs, p1Id, p2Id, winnerId]);

    // Playback state
    const [currentIndex, setCurrentIndex] = useState(0);
    const [speed, setSpeed] = useState<1 | 2 | 3>(1);
    const [isSkipped, setIsSkipped] = useState(false);
    const [isFinished, setIsFinished] = useState(false);

    // Refs for cleanup and preventing stale closures
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hasEndedRef = useRef(false);

    // Current event
    const currentEvent = useMemo(() => {
        if (currentIndex >= events.length) return null;
        return events[currentIndex];
    }, [events, currentIndex]);

    // Process current event (SFX, callbacks)
    useEffect(() => {
        if (!currentEvent) return;

        // Play SFX if defined
        if (currentEvent.sfx?.name) {
            const sfxName = mapToSfxName(currentEvent.sfx.name);
            if (sfxName) {
                playSfx(sfxName, {
                    volume: currentEvent.sfx.volume ?? 0.6,
                    cooldownMs: currentEvent.sfx.cooldownMs ?? 100,
                });
            }
        }

        // Notify parent of event change
        onEventChange?.(currentEvent, currentIndex);
    }, [currentEvent, currentIndex, onEventChange]);

    // Advance to next event
    const advanceEvent = useCallback(() => {
        if (hasEndedRef.current) return;

        setCurrentIndex(prev => {
            const next = prev + 1;
            if (next >= events.length) {
                hasEndedRef.current = true;
                setIsFinished(true);
                onBattleEnd?.();
                return prev;
            }
            return next;
        });
    }, [events.length, onBattleEnd]);

    // Main playback loop
    useEffect(() => {
        if (events.length === 0) return;
        if (hasEndedRef.current) return;
        if (currentIndex >= events.length) {
            if (!hasEndedRef.current) {
                hasEndedRef.current = true;
                setIsFinished(true);
                onBattleEnd?.();
            }
            return;
        }

        const event = events[currentIndex];

        // Calculate delay
        let delay = event.timing?.delayMs ?? SEVERITY_DELAYS[event.severity];
        delay = delay / speed;

        // Skip mode = instant
        if (isSkipped) {
            delay = 10;
        }

        // Schedule next event
        timeoutRef.current = setTimeout(advanceEvent, delay);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [currentIndex, events, speed, isSkipped, advanceEvent, onBattleEnd]);

    // Skip handler
    const skip = useCallback(() => {
        setIsSkipped(true);
        unlockSfx(); // Ensure audio is unlocked
    }, []);

    // Reset handler
    const reset = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        hasEndedRef.current = false;
        setCurrentIndex(0);
        setIsFinished(false);
        setIsSkipped(false);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return {
        events,
        currentIndex,
        currentEvent,
        isFinished,
        speed,
        isSkipped,
        setSpeed,
        skip,
        reset,
    };
}

/**
 * Map battle SFX name to actual SfxName type from sfx.ts
 */
function mapToSfxName(name: string): SfxName | null {
    const mapping: Record<string, SfxName> = {
        attack: 'attack',
        hit: 'hit',
        critical: 'crit',
        guard: 'guard',
        stun: 'stun',
        ult: 'ult',
        break: 'break',
        finisher: 'finisher',
        cheer: 'cheer',
        win: 'win',
        lose: 'lose',
    };
    return mapping[name] ?? null;
}
