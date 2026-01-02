/**
 * Boss Type Definitions
 * Shared types for Daily Boss, Milestone Boss, and Weekly Boss features
 */

// Boss type variants
export type BossType = 'TANK' | 'SPEED' | 'SHIELD' | 'REFLECT' | 'BERSERK';

// Base stats interface
export interface BossStats {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
}

// Daily Boss data
export interface DailyBossData {
    bossId: string;
    dateKey: string;
    type: BossType;
    name: string;
    epithet: string;
    baseName: string;
    stats: BossStats;
    shieldHp?: number;
    role: string;
    parts: Record<string, any>;
    colors: Record<string, string>;
}

// Daily Boss API response
export interface DailyBossResponse {
    boss: DailyBossData;
    canChallenge: boolean;
    hasScannedToday: boolean;
}

// Milestone data for rank-up exams
export interface MilestoneData {
    level: number;
    cleared: boolean;
    canChallenge: boolean;
    locked: boolean;
}

// Milestone Boss data
export interface MilestoneBossData {
    bossId: string;
    name: string;
    milestoneLevel: number;
    stats: BossStats;
    reward: {
        type: string;
        value: number;
        description: string;
    };
}

// Milestone Boss API response
export interface MilestoneBossResponse {
    userLevel: number;
    milestones: MilestoneData[];
    nextMilestone: number | null;
    bossData: MilestoneBossData | null;
    currentCapacity: number;
    clearedCount: number;
}

// Weekly Boss data
export interface WeeklyBossData {
    bossId: string;
    name: string;
    weekKey: string;
    stats: BossStats;
    reward: {
        credits: number;
        xp: number;
    };
}

// Weekly Boss API response
export interface WeeklyBossResponse {
    boss: WeeklyBossData;
    weekKey: string;
    rewardClaimed: boolean;
    lastResult: 'win' | 'loss' | null;
}

// Boss Battle Result
export interface BossBattleResult {
    battleId: string;
    result: 'win' | 'loss';
    winnerId: string;
    logs: any[];
    rewards: {
        xp: number;
        credits: number;
        scanTokens: number;
    };
    bossShieldBroken?: boolean;
    turnCount?: number;
}
