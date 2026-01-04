/**
 * Daily Boss Generation System
 * Deterministic boss generation based on JST date key
 */

import { SeededRandom } from "./seededRandom";
import { RobotData, RobotParts, RobotColors, RobotRole } from "./types";

// Boss Types (5 types, each with unique mechanics)
export type BossType = 'TANK' | 'SPEED' | 'SHIELD' | 'REFLECT' | 'BERSERK';

// Boss Traits (passed to battle engine)
export interface BossTraits {
    type: BossType;
    shieldHp?: number;  // SHIELD type only
}

// Boss Data (returned to client)
export interface BossData {
    bossId: string;
    dateKey: string;
    type: BossType;
    name: string;           // Full name (epithet + base name)
    epithet: string;        // e.g., "鋼鉄の"
    baseName: string;       // e.g., "グリム・バイト"
    stats: {
        hp: number;
        attack: number;
        defense: number;
        speed: number;
    };
    shieldHp?: number;      // SHIELD type only
    role: RobotRole;
    parts: RobotParts;
    colors: RobotColors;
}

// Boss Type definitions with stat multipliers
const BOSS_TYPES: BossType[] = ['TANK', 'SPEED', 'SHIELD', 'REFLECT', 'BERSERK'];

const BOSS_STAT_MULTIPLIERS: Record<BossType, { hp: number; atk: number; def: number; spd: number }> = {
    TANK: { hp: 1.5, atk: 0.8, def: 1.3, spd: 0.7 },
    SPEED: { hp: 0.9, atk: 1.0, def: 0.8, spd: 1.5 },
    SHIELD: { hp: 1.2, atk: 0.9, def: 1.4, spd: 0.8 },
    REFLECT: { hp: 1.0, atk: 1.1, def: 1.1, spd: 1.0 },
    BERSERK: { hp: 0.8, atk: 1.5, def: 0.7, spd: 1.2 },
};

// Maps BossType to RobotRole for special move compatibility
const BOSS_TYPE_TO_ROLE: Record<BossType, RobotRole> = {
    TANK: 'TANK',
    SPEED: 'SPEED',
    SHIELD: 'TANK',      // Uses TANK role for special
    REFLECT: 'TRICKY',
    BERSERK: 'ATTACKER',
};

// Epithets per boss type (10 each)
const BOSS_EPITHETS: Record<BossType, string[]> = {
    TANK: [
        "鋼鉄の", "不動の", "巨岩の", "鉄壁の", "重厚なる",
        "堅牢の", "万鈞の", "不落の", "剛毅の", "磐石の"
    ],
    SPEED: [
        "疾風の", "閃光の", "音速の", "迅雷の", "疾駆の",
        "瞬撃の", "神速の", "烈風の", "稲妻の", "流星の"
    ],
    SHIELD: [
        "守護の", "障壁の", "結界の", "護りし", "聖盾の",
        "防壁の", "加護の", "誓いし", "守護者", "盾神の"
    ],
    REFLECT: [
        "鏡像の", "反射の", "因果の", "逆転の", "映し身の",
        "報復の", "裏返しの", "双影の", "呪い返しの", "鏡面の"
    ],
    BERSERK: [
        "狂乱の", "暴走の", "破滅の", "狂戦士", "咆哮の",
        "荒ぶる", "暴虐の", "殲滅の", "破壊神", "終焉の"
    ],
};

// Boss base names (shared across types)
const BOSS_NAMES: string[] = [
    "グリム・バイト",
    "アイアンクラッド",
    "シャドウ・レイス",
    "サンダー・コア",
    "ブレイズ・ファング",
    "フロスト・エッジ",
    "ボルト・クラッシャー",
    "ダーク・ノヴァ",
    "スチール・ガーディアン",
    "クリムゾン・レイダー",
    "ファントム・スラッシャー",
    "メタル・タイラント",
    "サイバー・ドレッド",
    "ネオン・デスペラード",
    "ヴォイド・センチネル",
];

// Base stats for boss (before type multipliers)
const BASE_BOSS_STATS = {
    hp: 4500,
    attack: 250,
    defense: 120,
    speed: 90,
};

// SHIELD HP range (only for SHIELD type)
const SHIELD_HP_MIN = 400;
const SHIELD_HP_MAX = 700;

/**
 * Generate a deterministic daily boss based on date key
 * Same dateKey will always produce the same boss
 */
export function generateDailyBoss(dateKey: string): BossData {
    const bossId = `daily_${dateKey}`;
    const rng = new SeededRandom(bossId);

    // 1. Select boss type
    const typeIndex = rng.nextInt(0, BOSS_TYPES.length - 1);
    const type = BOSS_TYPES[typeIndex];

    // 2. Select epithet for this type
    const epithets = BOSS_EPITHETS[type];
    const epithetIndex = rng.nextInt(0, epithets.length - 1);
    const epithet = epithets[epithetIndex];

    // 3. Select base name
    const nameIndex = rng.nextInt(0, BOSS_NAMES.length - 1);
    const baseName = BOSS_NAMES[nameIndex];
    const name = `${epithet}${baseName}`;

    // 4. Calculate stats with type multipliers
    const multipliers = BOSS_STAT_MULTIPLIERS[type];
    const stats = {
        hp: Math.floor(BASE_BOSS_STATS.hp * multipliers.hp),
        attack: Math.floor(BASE_BOSS_STATS.attack * multipliers.atk),
        defense: Math.floor(BASE_BOSS_STATS.defense * multipliers.def),
        speed: Math.floor(BASE_BOSS_STATS.speed * multipliers.spd),
    };

    // 5. Calculate shield HP for SHIELD type
    let shieldHp: number | undefined;
    if (type === 'SHIELD') {
        shieldHp = rng.nextInt(SHIELD_HP_MIN, SHIELD_HP_MAX);
    }

    // 6. Generate visual appearance (deterministic)
    const parts = generateBossParts(rng);
    const colors = generateBossColors(rng, type);

    // 7. Get role for special move compatibility
    const role = BOSS_TYPE_TO_ROLE[type];

    return {
        bossId,
        dateKey,
        type,
        name,
        epithet,
        baseName,
        stats,
        shieldHp,
        role,
        parts,
        colors,
    };
}

/**
 * Generate boss parts (deterministic)
 */
function generateBossParts(rng: SeededRandom): RobotParts {
    return {
        head: rng.nextInt(1, 10),
        face: rng.nextInt(1, 10),
        body: rng.nextInt(1, 10),
        armLeft: rng.nextInt(1, 10),
        armRight: rng.nextInt(1, 10),
        legLeft: rng.nextInt(1, 10),
        legRight: rng.nextInt(1, 10),
        backpack: rng.nextInt(1, 10),
        weapon: rng.nextInt(1, 10),
        accessory: rng.nextInt(1, 10),
    };
}

/**
 * Generate boss colors based on type (deterministic)
 */
function generateBossColors(rng: SeededRandom, type: BossType): RobotColors {
    // Type-based color themes
    const colorThemes: Record<BossType, { primary: string; secondary: string; accent: string; glow: string }> = {
        TANK: { primary: "#4a5568", secondary: "#2d3748", accent: "#f59e0b", glow: "#fbbf24" },
        SPEED: { primary: "#3b82f6", secondary: "#1d4ed8", accent: "#60a5fa", glow: "#93c5fd" },
        SHIELD: { primary: "#10b981", secondary: "#065f46", accent: "#34d399", glow: "#6ee7b7" },
        REFLECT: { primary: "#8b5cf6", secondary: "#5b21b6", accent: "#a78bfa", glow: "#c4b5fd" },
        BERSERK: { primary: "#ef4444", secondary: "#991b1b", accent: "#f87171", glow: "#fca5a5" },
    };

    return colorThemes[type];
}

/**
 * Convert BossData to RobotData for battle engine compatibility
 */
export function bossToRobotData(boss: BossData): RobotData {
    return {
        id: boss.bossId,
        userId: "BOSS",
        name: boss.name,
        sourceBarcode: "BOSS",
        rarity: 5,  // Legendary-level boss
        rarityName: "デイリーボス",
        baseHp: boss.stats.hp,
        baseAttack: boss.stats.attack,
        baseDefense: boss.stats.defense,
        baseSpeed: boss.stats.speed,
        elementType: 1,  // Neutral
        elementName: "無属性",
        level: 10,  // Fixed boss level
        parts: boss.parts,
        colors: boss.colors,
        role: boss.role as any,  // Boss uses legacy role type
        roleName: getBossRoleName(boss.type),
        evolutionLevel: 0,
        totalBattles: 0,
        totalWins: 0,
        isFavorite: false,
    };
}

function getBossRoleName(type: BossType): string {
    const names: Record<BossType, string> = {
        TANK: "重装",
        SPEED: "高速",
        SHIELD: "障壁",
        REFLECT: "反射",
        BERSERK: "狂戦",
    };
    return names[type];
}

/**
 * Get boss traits for battle engine
 */
export function getBossTraits(boss: BossData): BossTraits {
    return {
        type: boss.type,
        shieldHp: boss.shieldHp,
    };
}
