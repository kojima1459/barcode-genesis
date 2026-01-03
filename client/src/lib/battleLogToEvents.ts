/**
 * BattleLog to BattleEvent Conversion
 * 
 * Converts raw BattleLog[] from server into normalized BattleEventBase[]
 * that the UI can consume for replay, SE, effects, and HUD updates.
 */

import { BattleLog } from '@/types/shared';
import {
    BattleEventBase,
    BattleEventType,
    EventSeverity,
    BattleSide,
    BattleSfxName,
    ShakeIntensity,
    SEVERITY_DELAYS,
} from '@/types/battleEvents';

export interface ConversionContext {
    p1Id: string;
    p2Id: string;
}

/**
 * Convert BattleLog array to normalized BattleEvent array
 */
export function battleLogToEvents(
    logs: BattleLog[],
    ctx: ConversionContext
): BattleEventBase[] {
    const events: BattleEventBase[] = [];
    let eventIndex = 0;

    logs.forEach((log, logIndex) => {
        const turn = log.turn ?? logIndex + 1;
        const side = getSide(log.attackerId, ctx);
        const severity = getSeverity(log);

        // Helper to create event with auto-incrementing index
        const createEvent = (
            type: BattleEventType,
            overrides: Partial<BattleEventBase> = {}
        ): BattleEventBase => {
            const event: BattleEventBase = {
                id: `${turn}-${eventIndex}-${type}`,
                turn,
                at: eventIndex++,
                type,
                side,
                severity,
                ...overrides,
            };
            return event;
        };

        // --- Event Generation Logic ---

        // 1. STANCE event (if stance outcome exists)
        if (log.stanceAttacker && log.stanceDefender && log.stanceOutcome) {
            events.push(createEvent('STANCE', {
                ui: {
                    headline: `${log.stanceAttacker} vs ${log.stanceDefender}`,
                    subline: log.stanceOutcome,
                },
                timing: { delayMs: 150 },
            }));
        }

        // 2. OVERDRIVE event (CLIMAX)
        if (log.overdriveTriggered) {
            events.push(createEvent('OVERDRIVE', {
                severity: 'CLIMAX',
                ui: {
                    headline: log.overdriveMessage || 'OVERDRIVE!',
                    message: log.overdriveMessage,
                },
                sfx: { name: 'ult', volume: 0.8 },
                motion: { shake: 'BIG', zoom: 'IN', flash: true },
                timing: { delayMs: SEVERITY_DELAYS.CLIMAX },
            }));
        }

        // 3. SPECIAL event (CLIMAX)
        if (log.specialTriggered) {
            const headline = [log.specialRoleName, log.specialName]
                .filter(Boolean)
                .join(' ') || 'SPECIAL!';
            events.push(createEvent('SPECIAL', {
                severity: 'CLIMAX',
                ui: {
                    headline,
                    subline: log.specialImpact,
                    message: log.specialHits && log.specialHits > 1
                        ? `×${log.specialHits}`
                        : undefined,
                },
                sfx: { name: 'ult', volume: 0.8 },
                motion: { shake: 'BIG', zoom: 'IN', flash: true },
                timing: { delayMs: SEVERITY_DELAYS.CLIMAX },
            }));
        }

        // 4. ITEM event
        if (log.itemApplied && log.itemType) {
            events.push(createEvent('ITEM', {
                side: log.itemSide === 'P1' ? 'P1' : log.itemSide === 'P2' ? 'P2' : side,
                severity: 'HIGHLIGHT',
                ui: {
                    headline: log.itemType,
                    subline: log.itemEffect,
                    message: log.itemMessage,
                },
                timing: { delayMs: 200 },
            }));
        }

        // 5. CHEER event
        if (log.cheerApplied) {
            events.push(createEvent('CHEER', {
                side: log.cheerSide === 'P1' ? 'P1' : log.cheerSide === 'P2' ? 'P2' : side,
                severity: 'HIGHLIGHT',
                ui: {
                    headline: 'CHEER!',
                    subline: log.cheerMultiplier ? `×${log.cheerMultiplier}` : undefined,
                },
                sfx: { name: 'cheer', volume: 0.6 },
                timing: { delayMs: 200 },
            }));
        }

        // 6. ACTION event (attack/skill)
        if (log.action || log.skillName) {
            events.push(createEvent('ACTION', {
                ui: {
                    message: log.message,
                    headline: log.skillName || log.action,
                },
                sfx: { name: 'attack', volume: 0.5 },
                motion: { shake: 'NONE' },
                timing: { delayMs: 100 },
                meta: { action: log.action, skillName: log.skillName },
            }));
        }

        // 7. STATUS events (guard, stun)
        if (log.guarded) {
            events.push(createEvent('STATUS', {
                severity: 'HIGHLIGHT',
                ui: { headline: 'GUARD!' },
                sfx: { name: 'guard', volume: 0.5 },
                motion: { shake: 'SMALL' },
                timing: { delayMs: 150 },
                meta: { status: 'guard', multiplier: log.guardMultiplier },
            }));
        }

        if (log.stunApplied) {
            events.push(createEvent('STATUS', {
                severity: 'HIGHLIGHT',
                ui: { headline: 'STUNNED!' },
                sfx: { name: 'stun', volume: 0.5 },
                motion: { shake: 'SMALL', flash: true },
                timing: { delayMs: 200 },
                meta: { status: 'stun' },
            }));
        }

        // 8. DAMAGE event
        if (log.damage !== undefined && log.damage > 0) {
            const isCrit = log.isCritical;
            const damageShake: ShakeIntensity = isCrit ? 'BIG' :
                log.damage > 50 ? 'SMALL' : 'SMALL';

            events.push(createEvent('DAMAGE', {
                severity: isCrit ? 'HIGHLIGHT' : severity,
                ui: {
                    headline: isCrit ? 'CRITICAL!' : undefined,
                    message: `${log.damage}`,
                },
                sfx: {
                    name: isCrit ? 'critical' : 'hit',
                    volume: isCrit ? 0.7 : 0.5
                },
                motion: { shake: damageShake, flash: isCrit },
                timing: { delayMs: isCrit ? SEVERITY_DELAYS.HIGHLIGHT : SEVERITY_DELAYS.NORMAL },
                meta: {
                    damage: log.damage,
                    isCritical: isCrit,
                    attackerHp: log.attackerHp,
                    defenderHp: log.defenderHp,
                    pursuitDamage: log.pursuitDamage,
                    followUpDamage: log.followUpDamage,
                },
            }));
        }

        // 9. SHIELD event (boss)
        if (log.bossShieldRemaining !== undefined || log.bossShieldBroken) {
            events.push(createEvent('SHIELD', {
                severity: log.bossShieldBroken ? 'CLIMAX' : 'HIGHLIGHT',
                ui: {
                    headline: log.bossShieldBroken ? 'SHIELD BREAK!' : 'SHIELD',
                    subline: log.bossShieldRemaining !== undefined
                        ? `${log.bossShieldRemaining}`
                        : undefined,
                },
                sfx: log.bossShieldBroken
                    ? { name: 'break', volume: 0.8 }
                    : undefined,
                motion: log.bossShieldBroken
                    ? { shake: 'BIG', flash: true }
                    : { shake: 'SMALL' },
                timing: {
                    delayMs: log.bossShieldBroken
                        ? SEVERITY_DELAYS.CLIMAX
                        : 200
                },
            }));
        }

        // 10. FINISHER event (CLIMAX)
        if (log.finisherApplied) {
            events.push(createEvent('FINISHER', {
                severity: 'CLIMAX',
                ui: {
                    headline: 'FINISHER!',
                    subline: log.finisherMultiplier
                        ? `×${log.finisherMultiplier}`
                        : undefined,
                },
                sfx: { name: 'finisher', volume: 0.8 },
                motion: { shake: 'BIG', zoom: 'IN', flash: true },
                timing: { delayMs: SEVERITY_DELAYS.CLIMAX },
            }));
        }

        // 11. SUDDEN_DEATH event
        if (log.suddenDeathTick) {
            events.push(createEvent('SUDDEN_DEATH', {
                severity: 'CLIMAX',
                ui: {
                    headline: 'SUDDEN DEATH!',
                    subline: log.suddenDeathDamage
                        ? `${log.suddenDeathDamage}`
                        : undefined,
                },
                motion: { shake: 'BIG', flash: true },
                timing: { delayMs: SEVERITY_DELAYS.CLIMAX },
            }));
        }
    });

    return events;
}

/**
 * Determine which side (P1/P2) the event belongs to
 */
function getSide(attackerId: string | undefined, ctx: ConversionContext): BattleSide {
    if (!attackerId) return 'P1';
    return attackerId === ctx.p1Id ? 'P1' : 'P2';
}

/**
 * Determine severity classification for a log
 */
function getSeverity(log: BattleLog): EventSeverity {
    // CLIMAX: Major dramatic events
    if (
        log.overdriveTriggered ||
        log.specialTriggered ||
        log.finisherApplied ||
        log.bossShieldBroken ||
        log.suddenDeathTick
    ) {
        return 'CLIMAX';
    }

    // HIGHLIGHT: Notable events
    if (
        log.isCritical ||
        log.guarded ||
        log.stunApplied ||
        log.itemApplied ||
        log.cheerApplied ||
        (log.pursuitDamage && log.pursuitDamage > 0) ||
        (log.followUpDamage && log.followUpDamage > 0)
    ) {
        return 'HIGHLIGHT';
    }

    // NORMAL: Regular actions
    return 'NORMAL';
}

/**
 * Add RESULT event at the end (called separately after battle ends)
 */
export function createResultEvent(
    isWin: boolean,
    turn: number,
    eventIndex: number
): BattleEventBase {
    return {
        id: `${turn}-${eventIndex}-RESULT`,
        turn,
        at: eventIndex,
        type: 'RESULT',
        severity: 'CLIMAX',
        ui: {
            headline: isWin ? 'VICTORY!' : 'DEFEAT',
        },
        sfx: {
            name: isWin ? 'win' : 'lose',
            volume: 0.8,
        },
        motion: {
            shake: 'NONE',
            zoom: 'NONE',
            flash: false,
        },
        timing: {
            delayMs: 500,
        },
    };
}
