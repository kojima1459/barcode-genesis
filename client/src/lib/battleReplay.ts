import { BattleLog, RobotData } from "@/types/shared";

export type BattleEventType =
    | 'PHASE_START'
    | 'ATTACK_PREPARE'
    | 'ATTACK_IMPACT'
    | 'DAMAGE_POPUP'
    | 'HP_UPDATE'
    | 'LOG_MESSAGE'
    | 'SPECIAL_CUT_IN';

export interface BattleEvent {
    type: BattleEventType;
    attackerId?: string;
    defenderId?: string;
    damage?: number;
    isCritical?: boolean;
    isMiss?: boolean;
    isGuard?: boolean;
    cheerApplied?: boolean;
    currentHp?: Record<string, number>;
    message?: string;
    delay?: number; // Duration to wait AFTER this event

    // Extended HUD data from BattleLog
    stanceAttacker?: string;
    stanceDefender?: string;
    stanceOutcome?: string;
    stanceMultiplier?: number;

    // Overdrive
    overdriveTriggered?: boolean;
    overdriveMessage?: string;
    attackerOverdriveGauge?: number;
    defenderOverdriveGauge?: number;

    // Special Move
    specialTriggered?: boolean;
    specialName?: string;
    specialRoleName?: string;
    specialImpact?: string;
    specialHits?: number;

    // Finisher
    finisherApplied?: boolean;
    finisherMultiplier?: number;

    // Status effects
    guarded?: boolean;
    guardMultiplier?: number;
    stunApplied?: boolean;
    stunned?: boolean;
    pursuitDamage?: number;
    followUpDamage?: number;

    // Items
    itemApplied?: boolean;
    itemType?: string;
    itemEffect?: string;

    // Boss Shield
    bossShieldRemaining?: number;
    bossShieldBroken?: boolean;

    // Cheer details
    cheerSide?: string;
    cheerMultiplier?: number;

    // Turn tracking
    turn?: number;
}

export function generateBattleEvents(logs: BattleLog[], p1Id: string, p2Id: string): BattleEvent[] {
    const events: BattleEvent[] = [];

    logs.forEach((log, index) => {
        // Check if this is a special moment (overdrive or special trigger)
        const isSpecialMoment = log.overdriveTriggered || log.specialTriggered;
        const baseDelay = isSpecialMoment ? 150 : 100; // Slightly longer for special
        const impactDelay = isSpecialMoment ? 80 : 50;
        const hpUpdateDelay = isSpecialMoment ? 200 : 150;

        // 0. SPECIAL_CUT_IN event (before attack if triggered)
        if (isSpecialMoment) {
            events.push({
                type: 'SPECIAL_CUT_IN',
                attackerId: log.attackerId,
                overdriveTriggered: log.overdriveTriggered,
                overdriveMessage: log.overdriveMessage,
                specialTriggered: log.specialTriggered,
                specialName: log.specialName,
                specialRoleName: log.specialRoleName,
                specialImpact: log.specialImpact,
                specialHits: log.specialHits,
                delay: 800 // Cut-in duration (will be displayed for this long)
            });
        }

        // 1. Attack Preparation (Message) with extended HUD data
        events.push({
            type: 'LOG_MESSAGE',
            message: log.message,
            turn: log.turn,
            attackerId: log.attackerId,
            defenderId: log.defenderId,
            // Stance data
            stanceAttacker: log.stanceAttacker,
            stanceDefender: log.stanceDefender,
            stanceOutcome: log.stanceOutcome,
            stanceMultiplier: log.stanceMultiplier,
            // Overdrive gauges
            attackerOverdriveGauge: log.attackerOverdriveGauge,
            defenderOverdriveGauge: log.defenderOverdriveGauge,
            // Status
            guarded: log.guarded,
            guardMultiplier: log.guardMultiplier,
            stunApplied: log.stunApplied,
            stunned: log.stunned,
            // Items
            itemApplied: log.itemApplied,
            itemType: log.itemType,
            itemEffect: log.itemEffect,
            // Cheer
            cheerApplied: log.cheerApplied,
            cheerSide: log.cheerSide,
            cheerMultiplier: log.cheerMultiplier,
            // Boss Shield
            bossShieldRemaining: log.bossShieldRemaining,
            bossShieldBroken: log.bossShieldBroken,
            // Special/Finisher flags for HUD
            overdriveTriggered: log.overdriveTriggered,
            specialTriggered: log.specialTriggered,
            finisherApplied: log.finisherApplied,
            finisherMultiplier: log.finisherMultiplier,
            delay: baseDelay
        });

        // 2. Attack Animation Start (Attacker lunges)
        events.push({
            type: 'ATTACK_PREPARE',
            attackerId: log.attackerId,
            delay: baseDelay
        });

        // 3. Impact (Flash/Shake)
        events.push({
            type: 'ATTACK_IMPACT',
            attackerId: log.attackerId,
            defenderId: log.defenderId,
            isCritical: log.isCritical,
            isMiss: log.action === 'miss',
            isGuard: log.guarded,
            cheerApplied: log.cheerApplied,
            pursuitDamage: log.pursuitDamage,
            followUpDamage: log.followUpDamage,
            specialTriggered: log.specialTriggered,
            overdriveTriggered: log.overdriveTriggered,
            delay: impactDelay
        });

        // 4. Damage Popup & Text update
        if (log.damage > 0 || log.action === 'miss') {
            events.push({
                type: 'DAMAGE_POPUP',
                defenderId: log.defenderId,
                damage: log.damage,
                isCritical: log.isCritical,
                isMiss: log.action === 'miss',
                isGuard: log.guarded,
                cheerApplied: log.cheerApplied,
                specialTriggered: log.specialTriggered,
                specialHits: log.specialHits,
                delay: baseDelay
            });
        }

        // 5. HP Update
        events.push({
            type: 'HP_UPDATE',
            currentHp: {
                [log.attackerId]: log.attackerHp,
                [log.defenderId]: log.defenderHp
            },
            // Persist gauge values for HUD
            attackerOverdriveGauge: log.attackerOverdriveGauge,
            defenderOverdriveGauge: log.defenderOverdriveGauge,
            delay: hpUpdateDelay
        });

        // 6. Post-turn buffer
        events.push({
            type: 'PHASE_START',
            turn: log.turn,
            delay: 0
        });
    });

    return events;
}
