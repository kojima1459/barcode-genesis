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

    // 統計
    totalBattles?: number;
    totalWins?: number;
    isFavorite?: boolean;

    // Added for cosmetic items
    cosmetics?: string[];
}

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
}

export type FighterRef =
    | { kind: 'robot'; id: string }
    | { kind: 'variant'; id: string };

// ============================================
