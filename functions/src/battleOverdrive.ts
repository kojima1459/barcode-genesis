/**
 * BattleEngine v2: Overdrive System
 * Comeback mechanic that triggers when taking damage
 */

import { OverdriveState } from "./types";

/**
 * Create initial overdrive state
 */
export const createOverdriveState = (): OverdriveState => ({
    gauge: 0,
    isActive: false
});

/**
 * Add to overdrive gauge based on damage taken
 * @param state Current overdrive state
 * @param damageTaken Amount of damage taken
 * @param maxHp Robot's maximum HP
 * @param stanceLost Whether the robot lost the stance matchup
 */
export const addOverdrive = (
    state: OverdriveState,
    damageTaken: number,
    maxHp: number,
    stanceLost: boolean
): OverdriveState => {
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

/**
 * Check and trigger overdrive at turn start
 * @param state Current overdrive state
 * @returns Object with trigger status and updated state
 */
export const tickOverdrive = (
    state: OverdriveState
): { triggered: boolean; newState: OverdriveState; message?: string } => {
    // Check if should trigger
    if (state.gauge >= 100 && !state.isActive) {
        return {
            triggered: true,
            newState: {
                gauge: 0, // Reset gauge after trigger
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

/**
 * Get overdrive skill power multiplier
 * @param isActive Whether overdrive is currently active
 */
export const getOverdriveSkillMultiplier = (isActive: boolean): number => {
    return isActive ? 1.2 : 1.0;
};

/**
 * Get overdrive skill trigger rate bonus
 * @param isActive Whether overdrive is currently active
 */
export const getOverdriveTriggerBonus = (isActive: boolean): number => {
    return isActive ? 0.3 : 0.0;
};
