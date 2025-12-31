"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLevelMultiplier = exports.STAT_MULTIPLIER_CAP = exports.applyUserXp = exports.getWorkshopLines = exports.calculateNextLevelXp = exports.LEVEL_CAP = void 0;
exports.LEVEL_CAP = 30;
const calculateNextLevelXp = (level) => {
    if (level >= exports.LEVEL_CAP)
        return 0;
    return Math.round(20 * Math.pow(level, 1.6));
};
exports.calculateNextLevelXp = calculateNextLevelXp;
const getWorkshopLines = (level) => {
    if (level < 5)
        return 1;
    if (level < 10)
        return 2;
    if (level < 15)
        return 3;
    if (level < 20)
        return 4;
    if (level < 25)
        return 5;
    if (level < 30)
        return 6;
    return 7;
};
exports.getWorkshopLines = getWorkshopLines;
const applyUserXp = (currentLevel, currentXp, xpToAdd) => {
    let level = currentLevel || 1;
    let xp = (currentXp || 0) + xpToAdd;
    let leveledUp = false;
    // Safety brake for loop
    const MAX_LOOPS = 50;
    let loop = 0;
    while (level < exports.LEVEL_CAP && loop < MAX_LOOPS) {
        const required = (0, exports.calculateNextLevelXp)(level);
        if (xp >= required) {
            xp -= required;
            level++;
            leveledUp = true;
        }
        else {
            break;
        }
        loop++;
    }
    return {
        newLevel: level,
        newXp: xp,
        workshopLines: (0, exports.getWorkshopLines)(level),
        leveledUp
    };
};
exports.applyUserXp = applyUserXp;
// ============================================
// Level-Based Stat Scaling
// ============================================
exports.STAT_MULTIPLIER_CAP = 1.30;
/**
 * Compute stat multiplier based on robot level.
 * Step curve: Lv1-5 +2%/lvl, Lv6-10 +1%/lvl, Lv11+ +0.5%/lvl
 * Capped at 1.30x (30% max bonus)
 */
const getLevelMultiplier = (level) => {
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
    return Math.min(exports.STAT_MULTIPLIER_CAP, 1 + bonus);
};
exports.getLevelMultiplier = getLevelMultiplier;
//# sourceMappingURL=levelSystem.js.map