
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
