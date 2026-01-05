/**
 * Robot Role & Rarity System - Updated
 *
 * Deterministic role and rarity assignment from barcode seed.
 * Roles: ASSAULT, TANK, SNIPER, SUPPORT, TRICKSTER
 * Distribution: TRICKSTER is rare (~10%), others weighted for variety
 */

// ============================================================
// TYPE DEFINITIONS
// ============================================================

/** Robot role types (5 categories) */
export type RobotRole = 'ASSAULT' | 'TANK' | 'SNIPER' | 'SUPPORT' | 'TRICKSTER';

/** Robot rarity tiers */
export type RobotRarity = 'common' | 'rare' | 'legendary';

/** Special move types mapped to roles */
export type PhaseBSpecialType = 'burst' | 'guard' | 'accel' | 'heal' | 'focus';

// ============================================================
// ROLE ASSIGNMENT (Biased Distribution)
// ============================================================

/**
 * Role assignment from seed (deterministic with bias)
 * Distribution:
 *   - 0-34:  ASSAULT   (35%)
 *   - 35-54: TANK      (20%)
 *   - 55-74: SNIPER    (20%)
 *   - 75-89: SUPPORT   (15%)
 *   - 90-99: TRICKSTER (10%) - Rare!
 */
export function getRoleFromSeed(seed: number): RobotRole {
    const safeSeed = Math.abs(seed);
    // Use complex hash to spread distribution
    const digitsSum = Math.floor(safeSeed % 1000);
    const last2 = safeSeed % 100;
    const combined = (digitsSum * 7 + last2) % 100;

    if (combined < 35) return 'ASSAULT';
    if (combined < 55) return 'TANK';
    if (combined < 75) return 'SNIPER';
    if (combined < 90) return 'SUPPORT';
    return 'TRICKSTER';
}

/**
 * Rarity assignment from seed (deterministic)
 * Distribution: 1% legendary, 9% rare, 90% common
 */
export function getRarityFromSeed(seed: number): RobotRarity {
    const roll = Math.abs(seed) % 100;
    if (roll === 0) return 'legendary'; // 1%
    if (roll < 10) return 'rare';       // 9%
    return 'common';                    // 90%
}

// ============================================================
// ROLE STAT MULTIPLIERS
// ============================================================

/**
 * Role stat multipliers for base stat adjustment
 * Applied during robot generation (max ±12% for balance)
 *
 * ASSAULT:   ATK+8%, HP-4%           (offensive glass cannon)
 * TANK:      HP+12%, DEF+6%, SPD-5%  (tanky slow)
 * SNIPER:    SPD+10%, HP-6%          (fast fragile)
 * SUPPORT:   HP+3%, DEF+3%, ATK-3%   (utility)
 * TRICKSTER: SPD+5%, DEF-2%, ATK-2%  (tricky, guard/debuff)
 */
export const ROLE_STAT_MULTIPLIERS: Record<RobotRole, {
    hp: number;
    atk: number;
    def: number;
    spd: number;
}> = {
    ASSAULT: { hp: 0.96, atk: 1.08, def: 1.00, spd: 1.00 },
    TANK: { hp: 1.12, atk: 1.00, def: 1.06, spd: 0.95 },
    SNIPER: { hp: 0.94, atk: 1.00, def: 1.00, spd: 1.10 },
    SUPPORT: { hp: 1.03, atk: 0.97, def: 1.03, spd: 1.00 },
    TRICKSTER: { hp: 1.00, atk: 0.98, def: 0.98, spd: 1.05 },
};

/**
 * Level growth rates by role
 * Controls how much each stat grows per level
 */
export const ROLE_GROWTH_RATES: Record<RobotRole, {
    hp: number;
    atk: number;
    def: number;
}> = {
    ASSAULT: { hp: 0.8, atk: 1.3, def: 0.7 },
    TANK: { hp: 1.3, atk: 0.7, def: 1.2 },
    SNIPER: { hp: 0.7, atk: 1.1, def: 0.9 },
    SUPPORT: { hp: 1.0, atk: 0.8, def: 1.1 },
    TRICKSTER: { hp: 0.9, atk: 1.0, def: 1.0 },
};

/**
 * Calculate level bonus stats (server-side)
 * Capped at level 20 with diminishing returns
 */
export function getLevelBonus(level: number, role: RobotRole): {
    hp: number;
    atk: number;
    def: number;
} {
    const effectiveLevel = Math.min(level, 20);
    const baseBonus = {
        hp: Math.floor(effectiveLevel * 1.5),
        atk: Math.floor(effectiveLevel * 0.4),
        def: Math.floor(effectiveLevel * 0.3),
    };

    const growthRate = ROLE_GROWTH_RATES[role] || ROLE_GROWTH_RATES.ASSAULT;
    return {
        hp: Math.floor(baseBonus.hp * growthRate.hp),
        atk: Math.floor(baseBonus.atk * growthRate.atk),
        def: Math.floor(baseBonus.def * growthRate.def),
    };
}

// ============================================================
// SPECIAL MOVES
// ============================================================

/**
 * Map role to special move type
 */
export function getSpecialMoveForRole(role: RobotRole): PhaseBSpecialType {
    const mapping: Record<RobotRole, PhaseBSpecialType> = {
        ASSAULT: 'burst',  // DEF貫通 x1.35
        TANK: 'guard',  // ダメージ50%カット
        SNIPER: 'accel',  // 追加攻撃
        SUPPORT: 'heal',   // HP15%回復
        TRICKSTER: 'focus',  // ATK+30% 3ターン
    };
    return mapping[role] || 'burst';
}

// ============================================================
// DISPLAY LABELS (Japanese/English)
// ============================================================

/**
 * Role display labels (Japanese)
 */
export const ROLE_LABELS: Record<RobotRole, string> = {
    ASSAULT: 'アサルト',
    TANK: 'タンク',
    SNIPER: 'スナイパー',
    SUPPORT: 'サポート',
    TRICKSTER: 'トリックスター',
};

/**
 * Role descriptions (Japanese, short)
 */
export const ROLE_DESCRIPTIONS: Record<RobotRole, string> = {
    ASSAULT: '攻撃型',
    TANK: '防御型',
    SNIPER: '速攻型',
    SUPPORT: '支援型',
    TRICKSTER: '妨害型',
};

/**
 * Rarity display labels (Japanese)
 */
export const RARITY_LABELS: Record<RobotRarity, string> = {
    common: 'コモン',
    rare: 'レア',
    legendary: '伝説',
};

/**
 * Special move display names (Japanese)
 */
export const SPECIAL_MOVE_LABELS: Record<PhaseBSpecialType, string> = {
    burst: 'バースト',
    guard: 'アイアンウォール',
    accel: 'アクセル',
    heal: 'ヒール',
    focus: 'フォーカス',
};

// ============================================================
// BACKWARD COMPATIBILITY HELPERS
// ============================================================

/**
 * Get role from a robot, with fallback for legacy data
 * If role is undefined, derive from barcode or default to ASSAULT
 */
export function getRoleWithFallback(
    role: RobotRole | undefined,
    sourceBarcode?: string
): RobotRole {
    if (role && ROLE_LABELS[role]) {
        return role;
    }
    // Derive from barcode if available
    if (sourceBarcode && sourceBarcode.length >= 8) {
        const seed = sourceBarcode.split('').reduce(
            (hash, char, i) => (hash * 31 + parseInt(char, 10) + i) | 0,
            0
        );
        return getRoleFromSeed(seed);
    }
    // Ultimate fallback
    return 'ASSAULT';
}

/**
 * Get Japanese label for any role value (safe)
 */
export function getRoleLabelSafe(role: RobotRole | string | undefined): string {
    if (!role) return 'アサルト';
    return ROLE_LABELS[role as RobotRole] || 'アサルト';
}
