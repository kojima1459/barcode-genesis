"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLevelMultiplier = exports.applyRobotXp = exports.calculateEffectiveStats = exports.STAT_MULTIPLIER_CAP = exports.applyUserXp = exports.getWorkshopLines = exports.calculateNextLevelXp = exports.LEVEL_CAP = void 0;
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
/**
 * Compute effective stats based on robot level (Fixed additive growth).
 * hp = baseHp + floor(level * 1.0)
 * atk = baseAtk + floor(level * 0.3)
 * def = baseDef + floor(level * 0.3)
 * spd = baseSpd + floor(level * 0.3)
 */
const calculateEffectiveStats = (baseStats, level = 1) => {
    // Ensure level is at least 1
    const safeLevel = Math.max(1, level);
    return {
        hp: baseStats.hp + Math.floor(safeLevel * 1.0),
        attack: baseStats.attack + Math.floor(safeLevel * 0.3),
        defense: baseStats.defense + Math.floor(safeLevel * 0.3),
        speed: baseStats.speed + Math.floor(safeLevel * 0.3),
    };
};
exports.calculateEffectiveStats = calculateEffectiveStats;
// Re-use existing level curve for robots but with separate function for clarity
const applyRobotXp = (currentLevel, currentXp, xpToAdd) => {
    // Currently same logic as user XP, but explicitly separated for future tuning
    return (0, exports.applyUserXp)(currentLevel, currentXp, xpToAdd);
};
exports.applyRobotXp = applyRobotXp;
const getLevelMultiplier = (level) => {
    // Deprecated? Or used for something else?
    // User requested "Fixed additive growth", so we use calculateEffectiveStats instead.
    // Keeping this for backward compatibility if needed, or remove if unused.
    return 1.0;
};
exports.getLevelMultiplier = getLevelMultiplier;
//# sourceMappingURL=levelSystem.js.map