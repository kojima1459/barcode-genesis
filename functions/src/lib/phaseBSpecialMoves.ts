/**
 * Phase B: Special Moves System
 * 
 * Implements role-based special moves that trigger once per battle at HP <= 50%
 * All special moves are deterministic (triggered by HP threshold, not random)
 * 
 * Role Mapping:
 * - ASSAULT → burst (メガブレイク): 1.35x damage
 * - TANK → guard (アイアンバリア): 0.7x damage taken
 * - SNIPER → accel (ヘッドショット): 1.15x + guaranteed crit
 * - SUPPORT → heal (リペアパルス): 8% HP recovery
 * - TRICKSTER → focus (シグナルジャム): enemy next attack 0.85x
 */

import { RobotRole, PhaseBSpecialType, getSpecialMoveForRole } from './robotRoles';

export interface SpecialMoveEffect {
    type: PhaseBSpecialType;
    name: string;           // Japanese display name
    description: string;    // Japanese description
    trigger: (currentHp: number, maxHp: number) => boolean;
}

// HP threshold for special move activation (50%)
const SPECIAL_HP_THRESHOLD = 0.5;

/**
 * Special Move Definitions (Phase B)
 * 
 * Effects are conservative to avoid breaking balance:
 * - burst: 1.35x (single hit, clear impact)
 * - guard: 0.7x damage taken (one-time shield)
 * - accel: 1.15x + guaranteed crit (sniper precision)
 * - heal: 8% HP recovery (emergency sustain)
 * - focus: enemy debuff 0.85x (disruption)
 */
export const PHASE_B_SPECIAL_MOVES: Record<PhaseBSpecialType, SpecialMoveEffect> = {
    burst: {
        type: 'burst',
        name: 'メガブレイク',
        description: '次の攻撃が1.35倍',
        trigger: (hp, maxHp) => hp <= maxHp * SPECIAL_HP_THRESHOLD
    },
    guard: {
        type: 'guard',
        name: 'アイアンバリア',
        description: '次の被ダメージ30%軽減',
        trigger: (hp, maxHp) => hp <= maxHp * SPECIAL_HP_THRESHOLD
    },
    heal: {
        type: 'heal',
        name: 'リペアパルス',
        description: '最大HPの8%回復',
        trigger: (hp, maxHp) => hp <= maxHp * SPECIAL_HP_THRESHOLD
    },
    accel: {
        type: 'accel',
        name: 'ヘッドショット',
        description: '1.15倍+クリティカル確定',
        trigger: (hp, maxHp) => hp <= maxHp * SPECIAL_HP_THRESHOLD
    },
    focus: {
        type: 'focus',
        name: 'シグナルジャム',
        description: '相手の次攻撃0.85倍',
        trigger: (hp, maxHp) => hp <= maxHp * SPECIAL_HP_THRESHOLD
    }
};

/**
 * Get special move for a robot's role
 * Supports both old (striker, tank, speed, support, balanced) and 
 * new (ASSAULT, TANK, SNIPER, SUPPORT, TRICKSTER) role names
 */
export function getSpecialMove(role?: RobotRole | any): SpecialMoveEffect | null {
    if (!role || typeof role !== 'string') return null;

    // Map new role names to special types
    const roleUppercase = role.toUpperCase();
    if (['ASSAULT', 'TANK', 'SNIPER', 'SUPPORT', 'TRICKSTER'].includes(roleUppercase)) {
        const specialType = getSpecialMoveForRole(roleUppercase as RobotRole);
        return PHASE_B_SPECIAL_MOVES[specialType];
    }

    // Legacy role names support
    if (['striker', 'tank', 'speed', 'support', 'balanced'].includes(role)) {
        const specialType = getSpecialMoveForRole(role as RobotRole);
        return PHASE_B_SPECIAL_MOVES[specialType];
    }

    return null;
}

/**
 * Check if special should trigger
 */
export function shouldTriggerSpecial(
    currentHp: number,
    maxHp: number,
    specialUsed: boolean,
    role?: RobotRole | any
): boolean {
    if (specialUsed) return false;

    const special = getSpecialMove(role);
    if (!special) return false;

    return special.trigger(currentHp, maxHp);
}

/**
 * Apply special move effects
 * Returns modified stats/state
 * 
 * Updated effects:
 * - burst (ASSAULT): 1.35x damage multiplier
 * - guard (TANK): 0.7x damage taken (30% reduction)
 * - accel (SNIPER): 1.15x + guaranteed critical
 * - heal (SUPPORT): 8% HP recovery
 * - focus (TRICKSTER): enemy's next attack 0.85x
 */
export interface SpecialEffectResult {
    damageMultiplier?: number;       // For burst (1.35x) and accel (1.15x)
    defenseMultiplier?: number;      // For guard (0.7x damage taken)
    healAmount?: number;             // For heal (maxHp * 0.08)
    guaranteedCrit?: boolean;        // For accel (sniper precision)
    enemyDebuff?: number;            // For focus (enemy attack 0.85x)
    message: string;                 // Log message
    impactText: string;              // Short impact description for UI
}

export function applySpecialEffect(
    specialType: PhaseBSpecialType,
    maxHp: number,
    _currentAtk: number
): SpecialEffectResult {
    const special = PHASE_B_SPECIAL_MOVES[specialType];

    switch (specialType) {
        case 'burst':
            // ASSAULT: メガブレイク - 1.35x damage
            return {
                damageMultiplier: 1.35,
                message: `【必殺】${special.name}発動！`,
                impactText: '大ダメージ'
            };

        case 'guard':
            // TANK: アイアンバリア - 30% damage reduction (0.7x)
            return {
                defenseMultiplier: 0.7,
                message: `【必殺】${special.name}発動！`,
                impactText: '軽減'
            };

        case 'heal':
            // SUPPORT: リペアパルス - 8% HP recovery
            return {
                healAmount: Math.floor(maxHp * 0.08),
                message: `【必殺】${special.name}発動！`,
                impactText: '回復'
            };

        case 'accel':
            // SNIPER: ヘッドショット - 1.15x + guaranteed crit
            return {
                damageMultiplier: 1.15,
                guaranteedCrit: true,
                message: `【必殺】${special.name}発動！`,
                impactText: '必中クリティカル'
            };

        case 'focus':
            // TRICKSTER: シグナルジャム - enemy attack 0.85x
            return {
                enemyDebuff: 0.85,
                message: `【必殺】${special.name}発動！`,
                impactText: '妨害'
            };

        default:
            return {
                message: `【必殺】発動！`,
                impactText: '特殊効果'
            };
    }
}

