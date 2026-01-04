/**
 * Battle FX Helpers - Camera shake, zoom, and visual effects
 * 
 * Provides timing constants and impact calculation for battle presentation.
 * No external dependencies - uses CSS classes and requestAnimationFrame.
 */

import { BattleLog } from '@/types/shared';
import { SfxName } from '@/lib/sfx';

/**
 * Base timing for log step progression (milliseconds)
 */
/**
 * Base timing for log step progression (milliseconds)
 */
export const PLAY_STEP_MS = 400;

/**
 * Additional delay for important events (ms) - reduced for snappy feel
 */
export const IMPORTANT_EVENT_BONUS_MS = 100;

/**
 * Log Type Classification for tempo optimization
 * NORMAL: Fast playback (0.75x delay)
 * HIGHLIGHT: Standard playback (1.0x delay)  
 * CLIMAX: Slow playback for dramatic effect (1.35x delay)
 */
export type LogType = 'NORMAL' | 'HIGHLIGHT' | 'CLIMAX';

/**
 * Tempo multipliers per log type
 */
export const TEMPO_MULTIPLIERS: Record<LogType, number> = {
    NORMAL: 0.45,  // Much faster non-highlight events
    HIGHLIGHT: 0.85,
    CLIMAX: 1.2,
};

/**
 * Max delay cap at 3x speed to prevent CLIMAX from feeling slow
 */
export const MAX_DELAY_AT_3X = 250; // ms

/**
 * Classify a BattleLog into NORMAL/HIGHLIGHT/CLIMAX
 */
export function classifyLogType(log: BattleLog): LogType {
    // CLIMAX: Major events that should be dramatic
    if (
        log.overdriveTriggered ||
        log.specialTriggered ||
        log.finisherApplied ||
        log.bossShieldBroken ||
        log.suddenDeathTick
    ) {
        return 'CLIMAX';
    }

    // HIGHLIGHT: Notable but not dramatic
    if (
        log.isCritical ||
        log.pursuitDamage ||
        log.followUpDamage ||
        log.guarded ||
        log.stunApplied ||
        log.stunned ||
        log.itemApplied ||
        log.cheerApplied
    ) {
        return 'HIGHLIGHT';
    }

    // NORMAL: Regular attacks/damage
    return 'NORMAL';
}

/**
 * Calculate adjusted delay based on log type and speed setting
 * @param baseDelay - Original delay (ms)
 * @param logType - Classification of the log
 * @param speed - Speed multiplier (1, 2, or 3)
 */
export function calculateAdjustedDelay(
    baseDelay: number,
    logType: LogType,
    speed: 1 | 2 | 3
): number {
    const tempoMultiplier = TEMPO_MULTIPLIERS[logType];
    let adjusted = (baseDelay * tempoMultiplier) / speed;

    // Cap delay at 3x speed to keep CLIMAX from dragging
    if (speed === 3) {
        adjusted = Math.min(adjusted, MAX_DELAY_AT_3X);
    }

    return Math.max(adjusted, 20); // Minimum 20ms
}

/**
 * Get appropriate SE name from a BattleLog
 * Returns null if no SE should play for this log
 */
export function getSfxForLog(log: BattleLog): SfxName | null {
    // Priority order for SE selection

    // 1. Ultimate/Special moves
    if (log.overdriveTriggered || log.specialTriggered) {
        return 'ult';
    }

    // 2. Finisher
    if (log.finisherApplied) {
        return 'finisher';
    }

    // 3. Boss shield break
    if (log.bossShieldBroken) {
        return 'break';
    }

    // 4. Stun applied
    if (log.stunApplied) {
        return 'stun';
    }

    // 5. Guard
    if (log.guarded) {
        return 'guard';
    }

    // 6. Cheer
    if (log.cheerApplied) {
        return 'cheer';
    }

    // 7. Critical hit
    if (log.isCritical && log.damage && log.damage > 0) {
        return 'crit';
    }

    // 8. Normal attack with damage
    if (log.damage && log.damage > 0) {
        // Only play attack SE, let BattleReplay handle hit
        return 'attack';
    }

    // No SE for this log
    return null;
}

/**
 * Impact intensity levels for visual effects
 */
export type ImpactIntensity = 'none' | 'light' | 'medium' | 'heavy';

/**
 * Calculate impact intensity from battle log
 * Used to determine shake strength, flash duration, etc.
 */
export function getImpactIntensity(log: BattleLog): ImpactIntensity {
    // Climax events = heavy
    if (log.overdriveTriggered || log.specialTriggered || log.finisherApplied) {
        return 'heavy';
    }

    // Critical hits = heavy impact
    if (log.isCritical) {
        return 'heavy';
    }

    // Shield break, stun = medium
    if (log.bossShieldBroken || log.stunApplied || log.guarded) {
        return 'medium';
    }

    // Cheer applied = medium impact
    if (log.cheerApplied) {
        return 'medium';
    }

    // Damage dealt = light impact
    if (log.damage && log.damage > 0) {
        return 'light';
    }

    // Miss or non-damage event
    return 'none';
}

/**
 * Check if log is a major event (for extended timing)
 */
export function isImportantLog(log: BattleLog): boolean {
    const msg = log.message?.toLowerCase() || '';
    const logType = classifyLogType(log);

    return (
        logType === 'CLIMAX' ||
        logType === 'HIGHLIGHT' ||
        msg.includes('クリティカル') ||
        msg.includes('critical') ||
        msg.includes('会心') ||
        msg.includes('撃破') ||
        msg.includes('ko') ||
        msg.includes('defeated')
    );
}

/**
 * Apply camera shake effect to an element
 * Returns cleanup function
 */
export function applyCameraShake(
    element: HTMLElement,
    intensity: ImpactIntensity,
    durationMs: number = 300
): () => void {
    if (intensity === 'none') return () => { };

    const shakeClass = intensity === 'heavy' ? 'camera-shake-heavy' :
        intensity === 'medium' ? 'camera-shake-medium' :
            'camera-shake-light';

    element.classList.add(shakeClass);

    const timeout = setTimeout(() => {
        element.classList.remove(shakeClass);
    }, durationMs);

    return () => {
        clearTimeout(timeout);
        element.classList.remove(shakeClass);
    };
}

/**
 * Apply zoom effect to an element
 * Returns cleanup function
 */
export function applyCameraZoom(
    element: HTMLElement,
    zoomIn: boolean = true,
    durationMs: number = 200
): () => void {
    const zoomClass = zoomIn ? 'camera-zoom-in' : 'camera-zoom-out';

    element.classList.add(zoomClass);

    const timeout = setTimeout(() => {
        element.classList.remove(zoomClass);
    }, durationMs);

    return () => {
        clearTimeout(timeout);
        element.classList.remove(zoomClass);
    };
}

/**
 * Apply hit flash to defender element
 * Returns cleanup function
 */
export function applyHitFlash(
    element: HTMLElement,
    isCritical: boolean = false,
    durationMs: number = 120
): () => void {
    const flashClass = isCritical ? 'hit-flash-critical' : 'hit-flash-normal';

    element.classList.add(flashClass);

    const timeout = setTimeout(() => {
        element.classList.remove(flashClass);
    }, durationMs);

    return () => {
        clearTimeout(timeout);
        element.classList.remove(flashClass);
    };
}
