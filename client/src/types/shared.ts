// 共通型定義 (Functionsと同期)
// NOTE: This file should match functions/src/types.ts

export interface RobotParts {
    head: number;
    face: number;
    body: number;
    armLeft: number;
    armRight: number;
    legLeft: number;
    legRight: number;
    backpack: number;
    weapon: number;
    accessory: number;
}

export interface RobotColors {
    primary: string;
    secondary: string;
    accent: string;
    glow: string;
}

export interface RobotVisuals {
    aura?: 'none' | 'burning' | 'electric' | 'digital' | 'psycho' | 'angel';
    eyeGlow?: 'normal' | 'brilliant' | 'matrix';
    decal?: 'none' | 'number' | 'warning' | 'star' | 'stripe' | 'camo';
    weaponIcon?: 'none' | 'sword' | 'gun' | 'shield' | 'missile' | 'fist';
}

export interface Skill {
    id: string;
    name: string;
    description: string;
    type: 'attack' | 'defense' | 'heal' | 'buff' | 'debuff';
    power: number;
    accuracy: number;
    triggerRate: number;
}

export interface RobotData {
    id: string;
    userId?: string;
    name: string;
    sourceBarcode?: string;

    // ステータス
    rarity?: number;
    rarityName: string;
    baseHp: number;
    baseAttack: number;
    baseDefense: number;
    baseSpeed: number;
    elementType?: number;
    elementName?: string;

    // レベル
    level?: number;
    xp?: number;
    exp?: number;

    // 外観
    parts: RobotParts;
    colors: RobotColors;
    visuals?: RobotVisuals;
    rarityEffect?: 'none' | 'rare' | 'legendary';

    // スキル
    skills?: Array<string | Skill | { id?: string }>; // Client handles partial objects sometimes

    equipped?: {
        slot1?: string | null;
        slot2?: string | null;
    };

    // メタデータ
    createdAt?: any;
    updatedAt?: any;

    // 図鑑・進化用
    family?: number;           // 1-5 (DRINK, SNACK, DAILY, BEAUTY, OTHER)
    familyName?: string;
    slot?: number;             // 0-19
    evolutionLevel?: number;   // 0+
    epithet?: string;          // 二つ名
    variantKey?: number;       // Visual variant seed (0-99)

    // ロール情報 (Phase B - refined)
    role?: RobotRole; // New Phase B role system
    rarityTier?: RobotRarity; // New Phase B rarity (renamed to avoid conflict with legacy)

    // Legacy role fields (deprecated, keep for backward compat)
    roleName?: string;
    roleTitle?: string;

    // 統計
    totalBattles?: number;
    totalWins?: number;
    isFavorite?: boolean;

    // Added for cosmetic items
    cosmetics?: string[];
}

// ============================================
// Phase B: Role & Rarity System
// ============================================

/**
 * Robot Role - Determines stat tendencies and special move
 * Derived deterministically from barcode seed
 */
export type RobotRole = 'striker' | 'tank' | 'speed' | 'support' | 'balanced';

/**
 * Robot Rarity - Affects visual style and epithet
 * 1% legendary, 9% rare, 90% common
 */
export type RobotRarity = 'common' | 'rare' | 'legendary';

/**
 * Special Move Type - One per battle when HP drops below 40%
 * (Phase B - renamed to avoid conflict with legacy special moves)
 */
export type PhaseBSpecialType = 'burst' | 'guard' | 'heal' | 'accel' | 'focus';

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

export interface BattleLog {
    turn: number;
    attackerId: string;
    defenderId: string;
    action: string;
    skillName?: string;
    damage: number;
    isCritical: boolean;
    attackerHp: number;
    defenderHp: number;
    message: string;
    // Cheer System (応援)
    cheerApplied?: boolean;
    cheerSide?: 'P1' | 'P2';
    cheerMultiplier?: number;
    // Pre-Battle Item System
    itemApplied?: boolean;
    itemSide?: 'P1' | 'P2';
    itemType?: BattleItemType;
    itemEffect?: string;
    itemEvent?: "ITEM_USED" | "ITEM_APPLIED";
    itemMessage?: string;

    // Guard / Pursuit / Stun
    guarded?: boolean;
    guardMultiplier?: number;
    pursuitDamage?: number;
    followUpDamage?: number;
    stunApplied?: boolean;
    stunTargetId?: string;
    stunned?: boolean;

    // Phase B: Special Moves
    specialApplied?: boolean;
    specialType?: PhaseBSpecialType;
    specialMessage?: string;
    specialTriggered?: boolean;  // Added for battleFx.ts
    finisherApplied?: boolean;   // Added for battleFx.ts

    // Boss Battle specific
    bossShieldBroken?: boolean;  // Added for battleFx.ts

    // Stance System (battleLogToEvents.ts)
    stanceAttacker?: string;
    stanceDefender?: string;
    stanceOutcome?: 'WIN' | 'LOSE' | 'DRAW';

    // Phase B: Level Bonus (for transparency)
    levelBonus?: {
        attackerLevel?: number;
        defenderLevel?: number;
        attackerBonus?: { hp: number; atk: number; def: number };
        defenderBonus?: { hp: number; atk: number; def: number };
    };
}

export type BattleItemType = 'BOOST' | 'SHIELD' | 'JAMMER' | 'DRONE' | 'DISRUPT' | 'CANCEL_CRIT';

export interface BattleItemInput {
    p1?: BattleItemType | null;
    p2?: BattleItemType | null;
}

export interface BattleResult {
    winnerId: string;
    loserId: string;
    logs: BattleLog[];
    rewards: {
        exp: number;
        coins: number;
        newSkill?: string;
        // Robot Leveling
        robotLevel?: number;
        robotXpEarned?: number;
        robotLevelUp?: boolean;
        upgradedSkill?: string;
        credits?: number; // Server uses credits
        dailyCapApplied?: boolean;
        dailyCreditsCapApplied?: boolean;
        creditsReward?: number;
        xpReward?: number;
        scanTokensGained?: number;
        xp?: number;
        xpBefore?: number;
        xpAfter?: number;
        levelBefore?: number;
        levelAfter?: number;
        capped?: boolean;
        capRemaining?: number;
        reason?: "DAILY_CAP" | null;
    };
    totalDamageP1?: number;
    totalDamageP2?: number;
    turnCount?: number;
    resolvedPlayerRobot?: RobotData;
}

export interface MatchBattleResponse {
    battleId: string;
    result: {
        winner: 'player' | 'opponent' | 'draw'; // Added draw
        log: BattleLog[];
    };
    rewards?: {
        exp: number;
        coins: number;
        credits?: number;
        xp?: number;
        newSkill?: string;
        upgradedSkill?: string;
        dailyCapApplied?: boolean;
        dailyCreditsCapApplied?: boolean;
        levelUp?: boolean;
        newLevel?: number;
        newWorkshopLines?: number;
        lastFreeVariantDate?: any; // Timestamp or string
        creditsReward?: number;
        xpReward?: number;
        scanTokensGained?: number;
        xpBefore?: number;
        xpAfter?: number;
        levelBefore?: number;
        levelAfter?: number;
        capped?: boolean;
        capRemaining?: number;
        reason?: "DAILY_CAP" | null;
    };
    resolvedPlayerRobot?: RobotData;
    experienceGained?: number;
}

export interface MatchmakingResponse {
    status: 'matched' | 'waiting' | 'timeout' | 'expired';
    queueId?: string;
    battleId?: string;
    opponent?: RobotData;
}

// ============================================
// Variant (Cosmetic Synthesis) Types
// ============================================

export type VariantSource = 'A' | 'B';
export type VariantPaletteMode = 'A' | 'B' | 'HALF';

export interface AppearanceRecipe {
    headSource: VariantSource;
    bodySource: VariantSource;
    armsSource: VariantSource;
    legsSource: VariantSource;
    accessorySource: VariantSource | 'NONE';
    paletteMode: VariantPaletteMode;
    overlayKey?: string;
}

export interface VariantData {
    id?: string;
    name?: string;
    parentRobotIds: [string, string]; // [A, B]
    appearanceRecipe: AppearanceRecipe;
    parts: RobotParts;
    colors: RobotColors;
    createdAt?: any;
    updatedAt?: any;
    role?: RobotRole;
    rarityTier?: RobotRarity;
}

export type FighterRef =
    | { kind: 'robot'; id: string }
    | { kind: 'variant'; id: string };

// ============================================
