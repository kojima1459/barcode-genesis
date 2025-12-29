"use strict";
/**
 * BattleEngine v2: Overdrive System
 * Comeback mechanic that triggers when taking damage
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOverdriveTriggerBonus = exports.getOverdriveSkillMultiplier = exports.tickOverdrive = exports.addOverdrive = exports.createOverdriveState = void 0;
/**
 * Create initial overdrive state
 */
const createOverdriveState = () => ({
    gauge: 0,
    isActive: false
});
exports.createOverdriveState = createOverdriveState;
/**
 * Add to overdrive gauge based on damage taken
 * @param state Current overdrive state
 * @param damageTaken Amount of damage taken
 * @param maxHp Robot's maximum HP
 * @param stanceLost Whether the robot lost the stance matchup
 */
const addOverdrive = (state, damageTaken, maxHp, stanceLost) => {
    let newGauge = state.gauge;
    // Add based on damage percentage (80% of damage ratio - aggressive for drama)
    if (damageTaken > 0 && maxHp > 0) {
        const damageRatio = damageTaken / maxHp;
        newGauge += damageRatio * 80;
    }
    // Bonus for losing stance (increased from 10 to 15)
    if (stanceLost) {
        newGauge += 15;
    }
    // Cap at 150 to prevent excessive buildup
    newGauge = Math.min(150, newGauge);
    return {
        gauge: newGauge,
        isActive: state.isActive
    };
};
exports.addOverdrive = addOverdrive;
/**
 * Check and trigger overdrive at turn start
 * @param state Current overdrive state
 * @returns Object with trigger status and updated state
 */
const tickOverdrive = (state) => {
    // Check if should trigger
    if (state.gauge >= 100 && !state.isActive) {
        return {
            triggered: true,
            newState: {
                gauge: 0,
                isActive: true
            },
            message: "OVERDRIVE発動！スキル威力が強化される！"
        };
    }
    // Clear active status (overdrive lasts 1 turn only)
    if (state.isActive) {
        return {
            triggered: false,
            newState: {
                gauge: state.gauge,
                isActive: false
            }
        };
    }
    return {
        triggered: false,
        newState: state
    };
};
exports.tickOverdrive = tickOverdrive;
/**
 * Get overdrive skill power multiplier
 * @param isActive Whether overdrive is currently active
 */
const getOverdriveSkillMultiplier = (isActive) => {
    return isActive ? 1.2 : 1.0;
};
exports.getOverdriveSkillMultiplier = getOverdriveSkillMultiplier;
/**
 * Get overdrive skill trigger rate bonus
 * @param isActive Whether overdrive is currently active
 */
const getOverdriveTriggerBonus = (isActive) => {
    return isActive ? 0.3 : 0.0;
};
exports.getOverdriveTriggerBonus = getOverdriveTriggerBonus;
//# sourceMappingURL=battleOverdrive.js.map