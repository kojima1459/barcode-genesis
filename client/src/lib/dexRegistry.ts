/**
 * Dex Registry - Deterministic slot generation for the collection system
 *
 * Creates a fixed set of "slots" based on Role × Rarity × VisualVariant.
 * Each robot is mapped to exactly one slot based on its deterministic properties.
 */

import { RobotData } from "@/types/shared";

// ============================================
// Type Definitions
// ============================================

export type RobotRole = 'ATTACKER' | 'TANK' | 'SPEED' | 'BALANCE' | 'TRICKY';

export const ROLES: RobotRole[] = ['ATTACKER', 'TANK', 'SPEED', 'BALANCE', 'TRICKY'] as const;
export const RARITIES = [1, 2, 3, 4, 5] as const; // 1=Common, 5=Legendary
export const VARIANT_KEYS = ['A', 'B', 'C', 'D'] as const;

export interface DexSlot {
    id: string;           // e.g., "ATTACKER-1-A"
    role: RobotRole;
    rarity: number;
    variantKey: string;
    displayIndex: number; // For ordering in the grid
}

// ============================================
// Role Display Names
// ============================================

export const ROLE_LABELS: Record<RobotRole, { ja: string; en: string }> = {
    ATTACKER: { ja: 'アタッカー', en: 'Attacker' },
    TANK: { ja: 'タンク', en: 'Tank' },
    SPEED: { ja: 'スピード', en: 'Speed' },
    BALANCE: { ja: 'バランス', en: 'Balance' },
    TRICKY: { ja: 'トリッキー', en: 'Tricky' },
};

export const RARITY_LABELS: Record<number, { ja: string; en: string }> = {
    1: { ja: 'ノーマル', en: 'Common' },
    2: { ja: 'レア', en: 'Rare' },
    3: { ja: 'スーパーレア', en: 'Super Rare' },
    4: { ja: 'ウルトラレア', en: 'Ultra Rare' },
    5: { ja: 'レジェンド', en: 'Legendary' },
};

// ============================================
// Slot Generation
// ============================================

/**
 * Generate all possible dex slots (5 roles × 5 rarities × 4 variants = 100 slots)
 */
export function generateDexSlots(): DexSlot[] {
    const slots: DexSlot[] = [];
    let displayIndex = 0;

    for (const role of ROLES) {
        for (const rarity of RARITIES) {
            for (const variantKey of VARIANT_KEYS) {
                slots.push({
                    id: `${role}-${rarity}-${variantKey}`,
                    role,
                    rarity,
                    variantKey,
                    displayIndex: displayIndex++,
                });
            }
        }
    }

    return slots;
}

/**
 * Get slots filtered by role
 */
export function getSlotsByRole(role: RobotRole): DexSlot[] {
    return generateDexSlots().filter(slot => slot.role === role);
}

// ============================================
// Robot → Slot Mapping
// ============================================

/**
 * Derive the variant key from robot parts (deterministic)
 * Uses the new variantKey field to map to 4 slots (A, B, C, D)
 */
function getVariantKey(robot: RobotData): string {
    if (typeof robot.variantKey === 'number') {
        const idx = Math.floor(robot.variantKey / 25) % 4; // 0-24, 25-49, 50-74, 75-99 map to 0-3
        return VARIANT_KEYS[idx];
    }
    // Fallback for migration
    const weaponIndex = robot.parts?.weapon ?? 1;
    const variantIndex = (weaponIndex - 1) % VARIANT_KEYS.length;
    return VARIANT_KEYS[variantIndex];
}

/**
 * Get the role from robot data, with fallback
 */
function getRobotRole(robot: RobotData): RobotRole {
    const role = (robot as any).role as RobotRole | undefined;
    if (role && ROLES.includes(role)) {
        return role;
    }
    // Fallback: derive from roleName if available
    const roleName = (robot as any).roleName as string | undefined;
    if (roleName) {
        const roleMap: Record<string, RobotRole> = {
            'アタッカー': 'ATTACKER',
            'アサルト': 'ATTACKER', // New mapping
            'タンク': 'TANK',
            'スピード': 'SPEED',
            'ランナー': 'SPEED', // New mapping
            'バランス': 'BALANCE',
            'サポート': 'BALANCE', // New mapping
            'トリッキー': 'TRICKY',
            'ジャガーノート': 'TRICKY' // New mapping
        };
        return roleMap[roleName] ?? 'BALANCE';
    }
    return 'BALANCE';
}

/**
 * Get the rarity from robot data (1-5), with fallback
 */
function getRobotRarity(robot: RobotData): number {
    const rarity = robot.rarity;
    if (typeof rarity === 'number' && rarity >= 1 && rarity <= 5) {
        return rarity;
    }
    return 1; // Default to Common
}

/**
 * Map a robot to its dex slot ID based on deterministic features
 */
export function getDexSlotId(robot: RobotData): string {
    const role = getRobotRole(robot);
    const rarity = getRobotRarity(robot);
    const variantKey = getVariantKey(robot);
    return `${role}-${rarity}-${variantKey}`;
}

/**
 * Get the DexSlot object for a robot
 */
export function getDexSlot(robot: RobotData): DexSlot {
    const role = getRobotRole(robot);
    const rarity = getRobotRarity(robot);
    const variantKey = getVariantKey(robot);
    const id = `${role}-${rarity}-${variantKey}`;

    // Calculate display index
    const roleIndex = ROLES.indexOf(role);
    const rarityIndex = rarity - 1;
    const variantIndex = VARIANT_KEYS.indexOf(variantKey as typeof VARIANT_KEYS[number]);
    const displayIndex = roleIndex * 20 + rarityIndex * 4 + variantIndex;

    return {
        id,
        role,
        rarity,
        variantKey,
        displayIndex,
    };
}

// ============================================
// Collection Progress
// ============================================

export interface DexProgress {
    total: number;
    unlocked: number;
    percent: number;
    remaining: number;
    byRole: Record<RobotRole, { total: number; unlocked: number }>;
}

/**
 * Check which slots the user has unlocked
 */
export function getUnlockedSlots(robots: RobotData[]): Set<string> {
    const unlocked = new Set<string>();
    for (const robot of robots) {
        if (robot.parts) {
            unlocked.add(getDexSlotId(robot));
        }
    }
    return unlocked;
}

/**
 * Calculate overall and per-role dex progress
 */
export function calculateDexProgress(robots: RobotData[]): DexProgress {
    const allSlots = generateDexSlots();
    const unlocked = getUnlockedSlots(robots);
    const total = allSlots.length;
    const unlockedCount = unlocked.size;

    // Per-role breakdown
    const byRole = {} as Record<RobotRole, { total: number; unlocked: number }>;
    for (const role of ROLES) {
        const roleSlots = allSlots.filter(s => s.role === role);
        const roleUnlocked = roleSlots.filter(s => unlocked.has(s.id)).length;
        byRole[role] = {
            total: roleSlots.length,
            unlocked: roleUnlocked,
        };
    }

    return {
        total,
        unlocked: unlockedCount,
        percent: total > 0 ? Math.round((unlockedCount / total) * 100) : 0,
        remaining: total - unlockedCount,
        byRole,
    };
}

// ============================================
// Placeholder Parts for Silhouettes
// ============================================

/**
 * Generate deterministic placeholder parts for a given slot
 * These are used to render silhouettes with consistent shapes per slot
 */
export function getPlaceholderVisuals(slot: DexSlot) {
    // Use slot properties to generate deterministic parts
    const roleIndex = ROLES.indexOf(slot.role);
    const rarityOffset = slot.rarity;
    const variantOffset = VARIANT_KEYS.indexOf(slot.variantKey as typeof VARIANT_KEYS[number]);

    // Create a seed from slot properties
    const seed = roleIndex * 100 + rarityOffset * 10 + variantOffset;

    // Calculate a representative variantKey (0-99) for this slot
    // Slot A (0) -> 12 (Low middle)
    // Slot B (1) -> 37 (Low middle)
    // Slot C (2) -> 62 (Low middle)
    // Slot D (3) -> 87 (High middle)
    const numericVariantKey = variantOffset * 25 + 12;

    return {
        parts: {
            head: ((seed + 1) % 10) + 1,
            face: ((seed + 2) % 10) + 1,
            body: ((seed + 3) % 10) + 1,
            armLeft: ((seed + 4) % 10) + 1,
            armRight: ((seed + 5) % 10) + 1,
            legLeft: ((seed + 6) % 10) + 1,
            legRight: ((seed + 7) % 10) + 1,
            backpack: ((seed + 8) % 10) + 1,
            weapon: ((seed + variantOffset) % 10) + 1,
            accessory: ((seed + 9) % 10) + 1,
        },
        variantKey: numericVariantKey
    };
}

export function getPlaceholderParts(slot: DexSlot) {
    return getPlaceholderVisuals(slot).parts;
}

/**
 * Generate placeholder colors (will be hidden by silhouette filter anyway)
 */
export function getPlaceholderColors() {
    return {
        primary: '#888888',
        secondary: '#444444',
        accent: '#666666',
        glow: '#555555',
    };
}
