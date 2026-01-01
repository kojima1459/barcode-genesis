/**
 * Robot Role & Rarity System - Phase B
 * 
 * Deterministic role and rarity assignment from barcode seed.
 * This file is shared between client and server (functions).
 */

export type RobotRole = 'striker' | 'tank' | 'speed' | 'support' | 'balanced';
export type RobotRarity = 'common' | 'rare' | 'legendary';
// Phase B Special Move Types (renamed to avoid conflict with legacy SpecialMoveType)
export type PhaseBSpecialType = 'burst' | 'guard' | 'heal' | 'accel' | 'focus';

/**
 * Role assignment from seed (deterministic)
 * Maps seed → role using modulo 5
 */
export function getRoleFromSeed(seed: number): RobotRole {
    const roles: RobotRole[] = ['striker', 'tank', 'speed', 'support', 'balanced'];
    const index = Math.floor((seed / 10000) % 5);
    return roles[index];
}

/**
 * Rarity assignment from seed (deterministic)
 * 1% legendary, 9% rare, 90% common
 */
export function getRarityFromSeed(seed: number): RobotRarity {
    const roll = seed % 100;
    if (roll === 0) return 'legendary'; // 1%
    if (roll < 10) return 'rare';       // 9%
    return 'common';                     // 90%
}

/**
 * Role stat multipliers
 * Applied to base stats for role differentiation
 */
export const ROLE_STAT_MULTIPLIERS: Record<RobotRole, { hp: number; atk: number; def: number }> = {
    striker: { hp: 0.9, atk: 1.2, def: 0.85 },
    tank: { hp: 1.2, atk: 0.85, def: 1.15 },
    speed: { hp: 0.85, atk: 1.0, def: 0.9 },
    support: { hp: 1.0, atk: 0.9, def: 1.05 },
    balanced: { hp: 1.0, atk: 1.0, def: 1.0 }
};

/**
 * Level growth rates by role
 * Controls how much each stat grows per level
 */
export const ROLE_GROWTH_RATES: Record<RobotRole, { hp: number; atk: number; def: number }> = {
    striker: { hp: 0.8, atk: 1.3, def: 0.7 },
    tank: { hp: 1.3, atk: 0.7, def: 1.2 },
    speed: { hp: 0.7, atk: 1.1, def: 0.9 },
    support: { hp: 1.0, atk: 0.8, def: 1.1 },
    balanced: { hp: 1.0, atk: 1.0, def: 1.0 }
};

/**
 * Calculate level bonus stats (server-side)
 * Capped at level 20 with diminishing returns
 */
export function getLevelBonus(level: number, role: RobotRole): { hp: number; atk: number; def: number } {
    // Base growth (before role modifier)
    const effectiveLevel = Math.min(level, 20); // Cap at 20
    const baseBonus = {
        hp: Math.floor(effectiveLevel * 1.5),  // +30 HP at L20
        atk: Math.floor(effectiveLevel * 0.4), // +8 ATK at L20
        def: Math.floor(effectiveLevel * 0.3)  // +6 DEF at L20
    };

    // Apply role growth rates
    const growthRate = ROLE_GROWTH_RATES[role];
    return {
        hp: Math.floor(baseBonus.hp * growthRate.hp),
        atk: Math.floor(baseBonus.atk * growthRate.atk),
        def: Math.floor(baseBonus.def * growthRate.def)
    };
}

/**
 * Map role to special move type
 */
export function getSpecialMoveForRole(role: RobotRole): PhaseBSpecialType {
    const mapping: Record<RobotRole, PhaseBSpecialType> = {
        striker: 'burst',   // Next attack ×1.35
        tank: 'guard',      // Next damage -50%
        speed: 'accel',     // Double attack this turn
        support: 'heal',    // Heal 15% max HP
        balanced: 'focus'   // +30% ATK for 3 turns
    };
    return mapping[role];
}

/**
 * Role display labels (Japanese)
 */
export const ROLE_LABELS: Record<RobotRole, string> = {
    striker: 'ストライカー',
    tank: 'タンク',
    speed: 'スピード',
    support: 'サポート',
    balanced: 'バランス型'
};

/**
 * Rarity display labels (Japanese)
 */
export const RARITY_LABELS: Record<RobotRarity, string> = {
    common: 'コモン',
    rare: 'レア',
    legendary: '伝説'
};

/**
 * Special move display names (Japanese)
 */
export const SPECIAL_MOVE_LABELS: Record<PhaseBSpecialType, string> = {
    burst: 'バースト',
    guard: 'アイアンウォール',
    accel: 'アクセル',
    heal: 'ヒール',
    focus: 'フォーカス'
};
