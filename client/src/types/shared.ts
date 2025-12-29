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
    };
}
