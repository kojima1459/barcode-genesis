import { BattleLog, RobotData } from "@/types/shared";

export type BattleEventType =
    | 'PHASE_START'
    | 'ATTACK_PREPARE'
    | 'ATTACK_IMPACT'
    | 'DAMAGE_POPUP'
    | 'HP_UPDATE'
    | 'LOG_MESSAGE';

export interface BattleEvent {
    type: BattleEventType;
    attackerId?: string;
    defenderId?: string;
    damage?: number;
    isCritical?: boolean;
    isMiss?: boolean;
    isGuard?: boolean;
    currentHp?: Record<string, number>;
    message?: string;
    delay?: number; // Duration to wait AFTER this event
}

export function generateBattleEvents(logs: BattleLog[], p1Id: string, p2Id: string): BattleEvent[] {
    const events: BattleEvent[] = [];

    logs.forEach((log) => {
        // 1. Attack Preparation (Message)
        events.push({
            type: 'LOG_MESSAGE',
            message: log.message, // e.g., "Robot used Attack!"
            delay: 400
        });

        // 2. Attack Animation Start (Attacker lunges)
        events.push({
            type: 'ATTACK_PREPARE',
            attackerId: log.attackerId,
            delay: 200
        });

        // 3. Impact (Flash/Shake)
        events.push({
            type: 'ATTACK_IMPACT',
            attackerId: log.attackerId,
            defenderId: log.defenderId,
            isCritical: log.isCritical,
            isMiss: log.action === 'miss', // Assume action 'miss' or check damage logic
            isGuard: log.guarded, // From expanded types
            delay: 100 // Short delay for shake impact
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
                delay: 600 // Let popup float a bit
            });
        }

        // 5. HP Update
        events.push({
            type: 'HP_UPDATE',
            currentHp: {
                [log.attackerId]: log.attackerHp,
                [log.defenderId]: log.defenderHp
            },
            delay: 400
        });

        // 6. Post-turn buffer
        events.push({
            type: 'PHASE_START',
            delay: 300
        });
    });

    return events;
}
