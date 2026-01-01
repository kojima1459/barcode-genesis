/**
 * Phase B: Special Moves System
 * 
 * Implements role-based special moves that trigger once per battle at HP <= 40%
 * All special moves are deterministic (triggered by HP threshold, not random)
 */

import { RobotRole, PhaseBSpecialType, getSpecialMoveForRole } from './robotRoles';

export interface SpecialMoveEffect {
    type: PhaseBSpecialType;
    name: string;           // Japanese display name
    description: string;    // Japanese description
    trigger: (currentHp: number, maxHp: number) => boolean;
}

/**
 * Special Move Definitions (Phase B)
 */
export const PHASE_B_SPECIAL_MOVES: Record<PhaseBSpecialType, SpecialMoveEffect> = {
    burst: {
        type: 'burst',
        name: 'バースト',
        description: '次の攻撃が1.35倍',
        trigger: (hp, maxHp) => hp <= maxHp * 0.4
    },
    guard: {
        type: 'guard',
        name: 'アイアンウォール',
        description: '次の被ダメージ50%軽減',
        trigger: (hp, maxHp) => hp <= maxHp * 0.4
    },
    heal: {
        type: 'heal',
        name: 'ヒール',
        description: '最大HPの15%回復',
        trigger: (hp, maxHp) => hp <= maxHp * 0.4
    },
    accel: {
        type: 'accel',
        name: 'アクセル',
        description: 'このターン2回攻撃',
        trigger: (hp, maxHp) => hp <= maxHp * 0.4
    },
    focus: {
        type: 'focus',
        name: 'フォーカス',
        description: '3ターンATK+30%',
        trigger: (hp, maxHp) => hp <= maxHp * 0.4
    }
};

/**
 * Get special move for a robot's role
 */
export function getSpecialMove(role?: RobotRole | any): SpecialMoveEffect | null {
    if (!role || typeof role !== 'string') return null;

    // Check if it's a Phase B role
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
 */
export interface SpecialEffectResult {
    damageMultiplier?: number;      // For burst (1.35x)
    defenseMultiplier?: number;     // For guard (0.5x damage taken)
    healAmount?: number;            // For heal (maxHp * 0.15)
    extraAttack?: boolean;          // For accel (attack again)
    temporaryAtkBoost?: number;     // For focus (+30% ATK for 3 turns)
    message: string;                // Log message
}

export function applySpecialEffect(
    specialType: PhaseBSpecialType,
    maxHp: number,
    currentAtk: number
): SpecialEffectResult {
    const special = PHASE_B_SPECIAL_MOVES[specialType];

    switch (specialType) {
        case 'burst':
            return {
                damageMultiplier: 1.35,
                message: `必殺技！${special.name}発動！次の攻撃が強化される！`
            };

        case 'guard':
            return {
                defenseMultiplier: 0.5,
                message: `必殺技！${special.name}発動！防御態勢を固めた！`
            };

        case 'heal':
            return {
                healAmount: Math.floor(maxHp * 0.15),
                message: `必殺技！${special.name}発動！HPが回復した！`
            };

        case 'accel':
            return {
                extraAttack: true,
                message: `必殺技！${special.name}発動！連続攻撃の構え！`
            };

        case 'focus':
            return {
                temporaryAtkBoost: Math.floor(currentAtk * 0.3),
                message: `必殺技！${special.name}発動！攻撃力が上昇した！`
            };

        default:
            return {
                message: `必殺技発動！`
            };
    }
}
