/**
 * Battle FX Helpers - Camera shake, zoom, and visual effects
 * 
 * Provides timing constants and impact calculation for battle presentation.
 * No external dependencies - uses CSS classes and requestAnimationFrame.
 */

import { BattleLog } from '@/types/shared';

/**
 * Base timing for log step progression (milliseconds)
 */
export const PLAY_STEP_MS = 500;

/**
 * Additional delay for important events (ms) - reduced for snappy feel
 */
export const IMPORTANT_EVENT_BONUS_MS = 100;

/**
 * Impact intensity levels for visual effects
 */
export type ImpactIntensity = 'none' | 'light' | 'medium' | 'heavy';

/**
 * Calculate impact intensity from battle log
 * Used to determine shake strength, flash duration, etc.
 */
export function getImpactIntensity(log: BattleLog): ImpactIntensity {
    const msg = log.message?.toLowerCase() || '';

    // Critical hits = heavy impact
    if (msg.includes('クリティカル') || msg.includes('critical') || msg.includes('会心')) {
        return 'heavy';
    }

    // Cheer applied = medium impact
    if (log.cheerApplied || msg.includes('応援') || msg.includes('cheer')) {
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

    return (
        msg.includes('クリティカル') ||
        msg.includes('critical') ||
        msg.includes('会心') ||
        log.cheerApplied === true ||
        msg.includes('応援') ||
        msg.includes('cheer') ||
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
