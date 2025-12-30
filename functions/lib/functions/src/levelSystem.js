"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyUserXp = exports.getWorkshopLines = exports.calculateNextLevelXp = exports.LEVEL_CAP = void 0;
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
//# sourceMappingURL=levelSystem.js.map