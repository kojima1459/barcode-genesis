import { RobotRole, getLevelBonus as getPhaseBLevelBonus } from './lib/robotRoles';
export const LEVEL_CAP = 30;

export const calculateNextLevelXp = (level: number): number => {
    if (level >= LEVEL_CAP) return 0;
    return Math.round(20 * Math.pow(level, 1.6));
};

export const getWorkshopLines = (level: number): number => {
    if (level < 5) return 1;
    if (level < 10) return 2;
    if (level < 15) return 3;
    if (level < 20) return 4;
    if (level < 25) return 5;
    if (level < 30) return 6;
    return 7;
};

// Milestone Boss thresholds - each cleared milestone grants +1 workshop capacity
export const MILESTONE_LEVELS = [5, 10, 15, 20, 25] as const;

/**
 * Calculate total workshop capacity including milestone bonuses
 * @param level User's current level
 * @param clearedMilestones Array of cleared milestone level strings (e.g., ["5", "10"])
 * @returns Total workshop capacity
 */
export const getWorkshopCapacity = (level: number, clearedMilestones: string[] = []): number => {
    const baseCapacity = getWorkshopLines(level);
    const milestoneBonus = clearedMilestones.length;
    return baseCapacity + milestoneBonus;
};

export interface LevelUpdateResult {
    newLevel: number;
    newXp: number;
    workshopLines: number;
    leveledUp: boolean;
}

export const applyUserXp = (currentLevel: number, currentXp: number, xpToAdd: number): LevelUpdateResult => {
    let level = currentLevel || 1;
    let xp = (currentXp || 0) + xpToAdd;
    let leveledUp = false;

    // Safety brake for loop
    const MAX_LOOPS = 50;
    let loop = 0;

    while (level < LEVEL_CAP && loop < MAX_LOOPS) {
        const required = calculateNextLevelXp(level);
        if (xp >= required) {
            xp -= required;
            level++;
            leveledUp = true;
        } else {
            break;
        }
        loop++;
    }

    return {
        newLevel: level,
        newXp: xp,
        workshopLines: getWorkshopLines(level),
        leveledUp
    };
};

// ============================================
// Level-Based Stat Scaling
// ============================================
export const STAT_MULTIPLIER_CAP = 1.30;

/**
 * Compute stat multiplier based on robot level.
 * Step curve: Lv1-5 +2%/lvl, Lv6-10 +1%/lvl, Lv11+ +0.5%/lvl
 * Capped at 1.30x (30% max bonus)
 */
/**
 * Compute effective stats based on robot level (Fixed additive growth).
 * hp = baseHp + floor(level * 1.0)
 * atk = baseAtk + floor(level * 0.3)
 * def = baseDef + floor(level * 0.3)
 * spd = baseSpd + floor(level * 0.3)
 */
export const calculateEffectiveStats = (baseStats: { hp: number; isPlayer: boolean; attack: number; defense: number; speed: number; }, level: number = 1) => {
    // Ensure level is at least 1
    const safeLevel = Math.max(1, level);

    return {
        hp: baseStats.hp + Math.floor(safeLevel * 1.0),
        attack: baseStats.attack + Math.floor(safeLevel * 0.3),
        defense: baseStats.defense + Math.floor(safeLevel * 0.3),
        speed: baseStats.speed + Math.floor(safeLevel * 0.3),
    };
};

/**
 * Phase B: Role-aware effective stats calculation
 * Uses Phase B level bonus system if role is provided
 */
export const calculateEffectiveStatsWithRole = (
    baseStats: { hp: number; attack: number; defense: number; speed: number },
    level: number = 1,
    role?: RobotRole | any  // Accept both Phase B and legacy roles
): { hp: number; attack: number; defense: number; speed: number } => {
    const safeLevel = Math.max(1, level);

    // If Phase B role is provided, use role-aware bonus
    if (role && typeof role === 'string' &&
        ['striker', 'tank', 'speed', 'support', 'balanced'].includes(role)) {
        const bonus = getPhaseBLevelBonus(safeLevel, role as RobotRole);
        return {
            hp: baseStats.hp + bonus.hp,
            attack: baseStats.attack + bonus.atk,
            defense: baseStats.defense + bonus.def,
            speed: baseStats.speed,  // Speed not affected by Phase B yet
        };
    }

    // Fallback to legacy system
    return {
        hp: baseStats.hp + Math.floor(safeLevel * 1.0),
        attack: baseStats.attack + Math.floor(safeLevel * 0.3),
        defense: baseStats.defense + Math.floor(safeLevel * 0.3),
        speed: baseStats.speed + Math.floor(safeLevel * 0.3),
    };
};

// Re-use existing level curve for robots but with separate function for clarity
export const applyRobotXp = (currentLevel: number, currentXp: number, xpToAdd: number): LevelUpdateResult => {
    // Currently same logic as user XP, but explicitly separated for future tuning
    return applyUserXp(currentLevel, currentXp, xpToAdd);
};

export const getLevelMultiplier = (level: number): number => {
    // Deprecated? Or used for something else?
    // User requested "Fixed additive growth", so we use calculateEffectiveStats instead.
    // Keeping this for backward compatibility if needed, or remove if unused.
    return 1.0;
};

