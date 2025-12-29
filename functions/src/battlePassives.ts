/**
 * BattleEngine v2: Part Passives System
 * Weapon/Backpack/Accessory parts grant unique in-battle effects
 */

import { RobotData, PassiveTrigger } from "./types";
import { SeededRandom } from "./seededRandom";

export interface PassiveDefinition {
    partType: "weapon" | "backpack" | "accessory";
    partId: number;
    name: string;
    triggerChance: number;
    description: string;
}

export interface PassiveEffect {
    // Damage modifiers
    damageMultiplier?: number;     // Multiply outgoing damage
    defenseMultiplier?: number;    // Multiply defense (lower = more damage taken)
    critBonus?: number;            // Add to crit chance
    followUpDamage?: number;       // Ratio of attack as follow-up damage
    damageReduction?: number;      // Multiply incoming damage
    healRatio?: number;            // Heal based on damage dealt
}

// ============================================
// PASSIVE DEFINITIONS (30 total: 10 per part type)
// ============================================

const WEAPON_PASSIVES: PassiveDefinition[] = [
    { partType: "weapon", partId: 1, name: "Sharpened Edge", triggerChance: 0.08, description: "クリティカル率+15%" },
    { partType: "weapon", partId: 2, name: "Heavy Swing", triggerChance: 0.10, description: "ダメージ+20%" },
    { partType: "weapon", partId: 3, name: "Quick Slash", triggerChance: 0.12, description: "追撃発生（20%ダメージ）" },
    { partType: "weapon", partId: 4, name: "Armor Break", triggerChance: 0.08, description: "防御貫通（防御-30%）" },
    { partType: "weapon", partId: 5, name: "Berserker", triggerChance: 0.06, description: "ダメージ+40%" },
    { partType: "weapon", partId: 6, name: "Precision Strike", triggerChance: 0.15, description: "クリティカル率+10%" },
    { partType: "weapon", partId: 7, name: "Energy Drain", triggerChance: 0.08, description: "与ダメの10%回復" },
    { partType: "weapon", partId: 8, name: "Piercing Shot", triggerChance: 0.10, description: "防御貫通（防御-50%）" },
    { partType: "weapon", partId: 9, name: "Dual Strike", triggerChance: 0.07, description: "追撃発生（35%ダメージ）" },
    { partType: "weapon", partId: 10, name: "Executioner", triggerChance: 0.05, description: "ダメージ+50%" },
];

const BACKPACK_PASSIVES: PassiveDefinition[] = [
    { partType: "backpack", partId: 1, name: "Thruster Boost", triggerChance: 0.10, description: "追撃発生（15%ダメージ）" },
    { partType: "backpack", partId: 2, name: "Emergency Repair", triggerChance: 0.06, description: "HP10%回復" },
    { partType: "backpack", partId: 3, name: "Targeting System", triggerChance: 0.12, description: "クリティカル率+12%" },
    { partType: "backpack", partId: 4, name: "Power Cell", triggerChance: 0.08, description: "ダメージ+15%" },
    { partType: "backpack", partId: 5, name: "Smoke Screen", triggerChance: 0.10, description: "被ダメ-20%" },
    { partType: "backpack", partId: 6, name: "Overcharge", triggerChance: 0.07, description: "ダメージ+30%" },
    { partType: "backpack", partId: 7, name: "Nano Repair", triggerChance: 0.08, description: "HP8%回復" },
    { partType: "backpack", partId: 8, name: "Lock-On", triggerChance: 0.10, description: "クリティカル確定" },
    { partType: "backpack", partId: 9, name: "Booster Ignition", triggerChance: 0.09, description: "追撃発生（25%ダメージ）" },
    { partType: "backpack", partId: 10, name: "Afterburner", triggerChance: 0.08, description: "追撃発生（35%ダメージ）" },
];

const ACCESSORY_PASSIVES: PassiveDefinition[] = [
    { partType: "accessory", partId: 1, name: "Iron Plating", triggerChance: 0.12, description: "被ダメ-15%" },
    { partType: "accessory", partId: 2, name: "Energy Shield", triggerChance: 0.12, description: "被ダメ-15%" },
    { partType: "accessory", partId: 3, name: "Counterweight", triggerChance: 0.10, description: "ダメージ+10%" },
    { partType: "accessory", partId: 4, name: "Lucky Charm", triggerChance: 0.15, description: "クリティカル率+8%" },
    { partType: "accessory", partId: 5, name: "Reinforced Armor", triggerChance: 0.10, description: "被ダメ-20%" },
    { partType: "accessory", partId: 6, name: "Focus Lens", triggerChance: 0.08, description: "クリティカル率+20%" },
    { partType: "accessory", partId: 7, name: "Life Steal Core", triggerChance: 0.06, description: "与ダメの15%回復" },
    { partType: "accessory", partId: 8, name: "Deflector", triggerChance: 0.08, description: "被ダメ-25%" },
    { partType: "accessory", partId: 9, name: "Aggressor Chip", triggerChance: 0.10, description: "ダメージ+15%" },
    { partType: "accessory", partId: 10, name: "Guardian Module", triggerChance: 0.07, description: "被ダメ-30%" },
];

// Combined lookup
const ALL_PASSIVES: PassiveDefinition[] = [
    ...WEAPON_PASSIVES,
    ...BACKPACK_PASSIVES,
    ...ACCESSORY_PASSIVES,
];

/**
 * Get passive definition for a specific part
 */
export const getPassive = (partType: "weapon" | "backpack" | "accessory", partId: number): PassiveDefinition | undefined => {
    return ALL_PASSIVES.find(p => p.partType === partType && p.partId === partId);
};

/**
 * Check if a passive triggers during an attack
 * @param rng SeededRandom instance
 * @param robot The robot whose passives to check
 * @param phase When the passive is being checked
 */
export const checkPassive = (
    rng: SeededRandom,
    robot: RobotData,
    partType: "weapon" | "backpack" | "accessory"
): PassiveTrigger | null => {
    const parts = robot.parts;
    if (!parts) return null;

    let partId: number;
    switch (partType) {
        case "weapon": partId = parts.weapon; break;
        case "backpack": partId = parts.backpack; break;
        case "accessory": partId = parts.accessory; break;
    }

    const passive = getPassive(partType, partId);
    if (!passive) return null;

    // Roll for trigger
    if (rng.next() < passive.triggerChance) {
        return {
            partType,
            partId,
            effectName: passive.name,
            effectDetail: passive.description
        };
    }

    return null;
};

/**
 * Get the effect values for a triggered passive
 */
export const getPassiveEffect = (trigger: PassiveTrigger): PassiveEffect => {
    const passive = getPassive(trigger.partType, trigger.partId);
    if (!passive) return {};

    // Map passive to effects based on name/description patterns
    const name = passive.name;

    // Damage bonuses
    if (name === "Executioner") return { damageMultiplier: 1.5 };
    if (name === "Berserker") return { damageMultiplier: 1.4 };
    if (name === "Overcharge") return { damageMultiplier: 1.3 };
    if (name === "Heavy Swing") return { damageMultiplier: 1.2 };
    if (name === "Power Cell" || name === "Counterweight" || name === "Aggressor Chip") return { damageMultiplier: 1.15 };

    // Crit bonuses
    if (name === "Focus Lens") return { critBonus: 0.2 };
    if (name === "Sharpened Edge") return { critBonus: 0.15 };
    if (name === "Targeting System") return { critBonus: 0.12 };
    if (name === "Precision Strike") return { critBonus: 0.1 };
    if (name === "Lucky Charm") return { critBonus: 0.08 };
    if (name === "Lock-On") return { critBonus: 1.0 }; // Guaranteed crit

    // Defense penetration
    if (name === "Piercing Shot") return { defenseMultiplier: 0.5 };
    if (name === "Armor Break") return { defenseMultiplier: 0.7 };

    // Follow-up attacks
    if (name === "Dual Strike" || name === "Afterburner") return { followUpDamage: 0.35 };
    if (name === "Booster Ignition") return { followUpDamage: 0.25 };
    if (name === "Quick Slash") return { followUpDamage: 0.2 };
    if (name === "Thruster Boost") return { followUpDamage: 0.15 };

    // Damage reduction
    if (name === "Guardian Module") return { damageReduction: 0.7 };
    if (name === "Deflector") return { damageReduction: 0.75 };
    if (name === "Reinforced Armor" || name === "Smoke Screen") return { damageReduction: 0.8 };
    if (name === "Iron Plating" || name === "Energy Shield") return { damageReduction: 0.85 };

    // Life steal
    if (name === "Life Steal Core") return { healRatio: 0.15 };
    if (name === "Energy Drain") return { healRatio: 0.1 };

    // Heal
    if (name === "Emergency Repair") return { healRatio: 0.1 }; // Used differently in battle
    if (name === "Nano Repair") return { healRatio: 0.08 };

    return {};
};
