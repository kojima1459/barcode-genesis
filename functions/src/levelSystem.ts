
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
export const getLevelMultiplier = (level: number): number => {
    const safeLevel = Math.max(1, Math.floor(level || 1));
    let bonus = 0;

    // Lv 1-5: +2% per level (4 steps after lv1)
    const tier1 = Math.min(safeLevel, 5) - 1;
    bonus += tier1 * 0.02;

    // Lv 6-10: +1% per level (5 steps)
    if (safeLevel > 5) {
        const tier2 = Math.min(safeLevel, 10) - 5;
        bonus += tier2 * 0.01;
    }

    // Lv 11+: +0.5% per level
    if (safeLevel > 10) {
        const tier3 = safeLevel - 10;
        bonus += tier3 * 0.005;
    }

    return Math.min(STAT_MULTIPLIER_CAP, 1 + bonus);
};

