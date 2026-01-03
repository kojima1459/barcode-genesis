import { BattleLog, RobotData } from "@/types/shared";
import { classifyLogType, LogType, TEMPO_MULTIPLIERS } from "@/lib/battleFx";

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

    // Log type for tempo optimization (used by BattleReplay)
    logType?: LogType;
}

// Base delays (ms) - tuned for snappy feel
const BASE_DELAYS = {
    MESSAGE: 70,
    PREPARE: 70,
    IMPACT: 40,
    POPUP: 80,
    HP_UPDATE: 110,
    CUT_IN: 650,
};

const FORCE_SPECIAL_TURN = 3;

export function generateBattleEvents(logs: BattleLog[], p1Id: string, p2Id: string): BattleEvent[] {
    const events: BattleEvent[] = [];
    const specialUsed: Record<string, boolean> = { [p1Id]: false, [p2Id]: false };

    logs.forEach((log, index) => {
        const attackerId = log.attackerId;
        const attackerGauge = typeof log.attackerOverdriveGauge === "number" ? log.attackerOverdriveGauge : 0;
        const rawSpecial = Boolean(log.specialTriggered || log.overdriveTriggered);
        const allowSpecial = rawSpecial && !specialUsed[attackerId];
        const forceSpecial = !rawSpecial && !specialUsed[attackerId] && (
            attackerGauge >= 100 || log.turn === FORCE_SPECIAL_TURN
        );
        const effectiveSpecial = allowSpecial || forceSpecial;
        const effectiveOverdrive = (log.overdriveTriggered && !specialUsed[attackerId]) || (forceSpecial && attackerGauge >= 100);

        if (effectiveSpecial) {
            specialUsed[attackerId] = true;
        }

        const logForTempo: BattleLog = {
            ...log,
            specialTriggered: effectiveSpecial || undefined,
            overdriveTriggered: effectiveOverdrive || undefined,
        };

        // Classify log type for tempo optimization
        const logType = classifyLogType(logForTempo);
        const tempoMultiplier = TEMPO_MULTIPLIERS[logType];

        // Calculate tempo-adjusted delays
        const messageDelay = Math.round(BASE_DELAYS.MESSAGE * tempoMultiplier);
        const prepareDelay = Math.round(BASE_DELAYS.PREPARE * tempoMultiplier);
        const impactDelay = Math.round(BASE_DELAYS.IMPACT * tempoMultiplier);
        const popupDelay = Math.round(BASE_DELAYS.POPUP * tempoMultiplier);
        const hpUpdateDelay = Math.round(BASE_DELAYS.HP_UPDATE * tempoMultiplier);

        // 0. SPECIAL_CUT_IN event (before attack)
        if (effectiveSpecial) {
            events.push({
                type: 'SPECIAL_CUT_IN',
                attackerId: log.attackerId,
                overdriveTriggered: effectiveOverdrive,
                overdriveMessage: log.overdriveMessage,
                specialTriggered: effectiveSpecial,
                specialName: log.specialName,
                specialRoleName: log.specialRoleName,
                specialImpact: log.specialImpact,
                specialHits: log.specialHits,
                logType,
                delay: BASE_DELAYS.CUT_IN // Cut-in duration
            });
        }

        // 1. Attack Preparation (Message) with extended HUD data
        if (logType !== 'NORMAL') {
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
                overdriveTriggered: effectiveOverdrive,
                specialTriggered: effectiveSpecial,
                finisherApplied: log.finisherApplied,
                finisherMultiplier: log.finisherMultiplier,
                logType,
                delay: messageDelay
            });
        }

        // 2. Attack Animation Start (Attacker lunges)
        events.push({
            type: 'ATTACK_PREPARE',
            attackerId: log.attackerId,
            logType,
            delay: prepareDelay
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
            specialTriggered: effectiveSpecial,
            overdriveTriggered: effectiveOverdrive,
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
                specialTriggered: effectiveSpecial,
                specialHits: log.specialHits,
                logType,
                delay: popupDelay
            });
        }

        // 5. HP Update
        events.push({
            type: 'HP_UPDATE',
            attackerId: log.attackerId,
            defenderId: log.defenderId,
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
