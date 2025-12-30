/**
 * Client-side Battle Engine (ported from functions/src/battleSystem.ts)
 * Pure functions with no Firebase/Firestore dependencies
 * 
 * WARNING: Do NOT use Math.random in this file - use SeededRandom for determinism
 */

// ============================================
// Types (subset from functions/src/types.ts)
// ============================================

export type Stance = "ATTACK" | "GUARD" | "TRICK";
export type StanceOutcome = "WIN" | "LOSE" | "DRAW";

export interface PassiveTrigger {
    partType: "weapon" | "backpack" | "accessory";
    partId: number;
    effectName: string;
    effectDetail: string;
}

export interface OverdriveState {
    gauge: number;
    isActive: boolean;
}

export interface Skill {
    id: string;
    name: string;
    description: string;
    type: 'attack' | 'defense' | 'heal' | 'buff' | 'debuff';
    power: number;
    accuracy: number;
    triggerRate: number;
}

export interface RobotParts {
    head: number;
    face: number;
    body: number;
    armLeft: number;
    armRight: number;
    legLeft: number;
    legRight: number;
    backpack: number;
    weapon: number;
    accessory: number;
}

export interface RobotColors {
    primary: string;
    secondary: string;
    accent: string;
    glow: string;
}

export interface BattleRobotData {
    id?: string;
    name: string;
    sourceBarcode?: string;
    baseHp: number;
    baseAttack: number;
    baseDefense: number;
    baseSpeed: number;
    elementType?: number;
    elementName?: string;
    parts: RobotParts;
    colors: RobotColors;
    skills?: Array<string | Skill>;
}

export interface BattleLog {
    turn: number;
    attackerId: string;
    defenderId: string;
    action: string;
    skillName?: string;
    damage: number;
    isCritical: boolean;
    attackerHp: number;
    defenderHp: number;
    message: string;
    stanceAttacker?: Stance;
    stanceDefender?: Stance;
    stanceOutcome?: StanceOutcome;
    stanceMultiplier?: number;
    overdriveTriggered?: boolean;
    overdriveMessage?: string;
    attackerOverdriveGauge?: number;
    defenderOverdriveGauge?: number;
    passiveTriggered?: PassiveTrigger;
    cheerApplied?: boolean;
    cheerSide?: 'P1' | 'P2';
    cheerMultiplier?: number;
    // Pre-Battle Item System
    itemApplied?: boolean;
    itemSide?: 'P1' | 'P2';
    itemType?: BattleItemType;
    itemEffect?: string;
    itemEvent?: "ITEM_USED" | "ITEM_APPLIED";
    itemMessage?: string;

    // Guard / Pursuit / Stun
    guarded?: boolean;
    guardMultiplier?: number;
    pursuitDamage?: number;
    followUpDamage?: number;
    stunApplied?: boolean;
    stunTargetId?: string;
    stunned?: boolean;
}

export type BattleItemType = 'BOOST' | 'SHIELD' | 'JAMMER' | 'DRONE' | 'DISRUPT' | 'CANCEL_CRIT';

export interface BattleItemInput {
    p1?: BattleItemType | null;
    p2?: BattleItemType | null;
}

export interface BattleResult {
    winnerId: string;
    loserId: string;
    logs: BattleLog[];
    rewards: {
        exp: number;
        coins: number;
        newSkill?: string;
        upgradedSkill?: string;
    };
    totalDamageP1?: number;
    totalDamageP2?: number;
    turnCount?: number;
}

export interface CheerInput {
    p1: boolean;
    p2: boolean;
}

// ============================================
// SeededRandom (ported from functions/src/seededRandom.ts)
// ============================================

export class SeededRandom {
    private seed: number;

    constructor(seed: string) {
        this.seed = this.hashString(seed);
    }

    private hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i += 1) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        // Use uint32 conversion with fallback to avoid 0 or negative seeds
        return (hash >>> 0) || 0x9e3779b9;
    }

    next(): number {
        this.seed ^= this.seed << 13;
        this.seed ^= this.seed >> 17;
        this.seed ^= this.seed << 5;
        return (this.seed >>> 0) / 4294967296;
    }

    nextInt(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    nextBool(probability: number = 0.5): boolean {
        return this.next() < probability;
    }
}

// ============================================
// Stance System (ported from functions/src/battleStance.ts)
// ============================================

interface StanceWeights {
    attack: number;
    guard: number;
    trick: number;
}

const getStanceWeights = (robot: BattleRobotData): StanceWeights => {
    const barcode = robot.sourceBarcode || "";
    const parts = robot.parts;

    let attack = 1.0;
    let guard = 1.0;
    let trick = 1.0;

    if (barcode.length > 0) {
        const lastDigit = parseInt(barcode[barcode.length - 1], 10) || 0;
        const secondLast = barcode.length > 1 ? parseInt(barcode[barcode.length - 2], 10) || 0 : 0;

        if (lastDigit % 2 === 0) attack += 0.3;
        else guard += 0.3;

        if (lastDigit === secondLast) trick += 0.5;

        if (Math.abs(lastDigit - secondLast) === 1) {
            attack += 0.15;
            guard += 0.15;
        }
    }

    if (parts) {
        if (parts.weapon >= 7) attack += 0.4;
        else if (parts.weapon <= 3) guard += 0.2;

        if (parts.backpack >= 7) trick += 0.3;
        if (parts.accessory >= 7) guard += 0.3;
    }

    const total = attack + guard + trick;
    return {
        attack: attack / total,
        guard: guard / total,
        trick: trick / total
    };
};

const pickStance = (rng: SeededRandom, weights: StanceWeights): Stance => {
    const roll = rng.next();

    if (roll < weights.attack) return "ATTACK";
    if (roll < weights.attack + weights.guard) return "GUARD";
    return "TRICK";
};

const resolveStance = (attacker: Stance, defender: Stance): StanceOutcome => {
    if (attacker === defender) return "DRAW";

    if (
        (attacker === "ATTACK" && defender === "TRICK") ||
        (attacker === "TRICK" && defender === "GUARD") ||
        (attacker === "GUARD" && defender === "ATTACK")
    ) {
        return "WIN";
    }

    return "LOSE";
};

const getStanceMultiplier = (outcome: StanceOutcome, isAttacker: boolean): number => {
    switch (outcome) {
        case "WIN":
            return isAttacker ? 1.25 : 0.8;
        case "LOSE":
            return isAttacker ? 0.8 : 1.25;
        case "DRAW":
        default:
            return 1.0;
    }
};

// ============================================
// Overdrive System (ported from functions/src/battleOverdrive.ts)
// ============================================

const createOverdriveState = (): OverdriveState => ({
    gauge: 0,
    isActive: false
});

const addOverdrive = (
    state: OverdriveState,
    damageTaken: number,
    maxHp: number,
    stanceLost: boolean
): OverdriveState => {
    let newGauge = state.gauge;

    if (damageTaken > 0 && maxHp > 0) {
        const damageRatio = damageTaken / maxHp;
        newGauge += damageRatio * 80;
    }

    if (stanceLost) {
        newGauge += 15;
    }

    newGauge = Math.min(150, newGauge);

    return {
        gauge: newGauge,
        isActive: state.isActive
    };
};

const tickOverdrive = (
    state: OverdriveState
): { triggered: boolean; newState: OverdriveState; message?: string } => {
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

const getOverdriveSkillMultiplier = (isActive: boolean): number => {
    return isActive ? 1.2 : 1.0;
};

const getOverdriveTriggerBonus = (isActive: boolean): number => {
    return isActive ? 0.3 : 0.0;
};

// ============================================
// Passives System (ported from functions/src/battlePassives.ts)
// ============================================

interface PassiveDefinition {
    partType: "weapon" | "backpack" | "accessory";
    partId: number;
    name: string;
    triggerChance: number;
    description: string;
}

interface PassiveEffect {
    damageMultiplier?: number;
    defenseMultiplier?: number;
    critBonus?: number;
    followUpDamage?: number;
    damageReduction?: number;
    healRatio?: number;
}

const ALL_PASSIVES: PassiveDefinition[] = [
    // Weapon passives
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
    // Backpack passives
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
    // Accessory passives
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

const getPassive = (partType: "weapon" | "backpack" | "accessory", partId: number): PassiveDefinition | undefined => {
    return ALL_PASSIVES.find(p => p.partType === partType && p.partId === partId);
};

const checkPassive = (
    rng: SeededRandom,
    robot: BattleRobotData,
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

const getPassiveEffect = (trigger: PassiveTrigger): PassiveEffect => {
    const passive = getPassive(trigger.partType, trigger.partId);
    if (!passive) return {};

    const name = passive.name;

    if (name === "Executioner") return { damageMultiplier: 1.5 };
    if (name === "Berserker") return { damageMultiplier: 1.4 };
    if (name === "Overcharge") return { damageMultiplier: 1.3 };
    if (name === "Heavy Swing") return { damageMultiplier: 1.2 };
    if (name === "Power Cell" || name === "Counterweight" || name === "Aggressor Chip") return { damageMultiplier: 1.15 };

    if (name === "Focus Lens") return { critBonus: 0.2 };
    if (name === "Sharpened Edge") return { critBonus: 0.15 };
    if (name === "Targeting System") return { critBonus: 0.12 };
    if (name === "Precision Strike") return { critBonus: 0.1 };
    if (name === "Lucky Charm") return { critBonus: 0.08 };
    if (name === "Lock-On") return { critBonus: 1.0 };

    if (name === "Piercing Shot") return { defenseMultiplier: 0.5 };
    if (name === "Armor Break") return { defenseMultiplier: 0.7 };

    if (name === "Dual Strike" || name === "Afterburner") return { followUpDamage: 0.35 };
    if (name === "Booster Ignition") return { followUpDamage: 0.25 };
    if (name === "Quick Slash") return { followUpDamage: 0.2 };
    if (name === "Thruster Boost") return { followUpDamage: 0.15 };

    if (name === "Guardian Module") return { damageReduction: 0.7 };
    if (name === "Deflector") return { damageReduction: 0.75 };
    if (name === "Reinforced Armor" || name === "Smoke Screen") return { damageReduction: 0.8 };
    if (name === "Iron Plating" || name === "Energy Shield") return { damageReduction: 0.85 };

    if (name === "Life Steal Core") return { healRatio: 0.15 };
    if (name === "Energy Drain") return { healRatio: 0.1 };

    if (name === "Emergency Repair") return { healRatio: 0.1 };
    if (name === "Nano Repair") return { healRatio: 0.08 };

    return {};
};

// ============================================
// Skills (ported from functions/src/skills.ts)
// ============================================

const SKILLS: Skill[] = [
    { id: "power_smash", name: "Power Smash", description: "A powerful physical attack.", type: "attack", power: 1.5, accuracy: 0.9, triggerRate: 0.2 },
    { id: "double_strike", name: "Double Strike", description: "Attacks twice in a row.", type: "attack", power: 0.8, accuracy: 0.85, triggerRate: 0.15 },
    { id: "laser_beam", name: "Laser Beam", description: "A precise energy attack.", type: "attack", power: 1.3, accuracy: 1.0, triggerRate: 0.2 },
    { id: "iron_wall", name: "Iron Wall", description: "Reduces damage taken significantly.", type: "defense", power: 0.5, accuracy: 1.0, triggerRate: 0.15 },
    { id: "evasion", name: "Evasion", description: "Dodges the enemy attack.", type: "defense", power: 0, accuracy: 0.5, triggerRate: 0.1 },
    { id: "repair", name: "Repair", description: "Restores HP.", type: "heal", power: 0.3, accuracy: 1.0, triggerRate: 0.1 },
    { id: "charge", name: "Charge", description: "Increases next attack power.", type: "buff", power: 1.5, accuracy: 1.0, triggerRate: 0.15 },
    { id: "jamming", name: "Jamming", description: "Lowers enemy accuracy.", type: "debuff", power: 0.7, accuracy: 0.9, triggerRate: 0.15 },
];

const getSkillById = (skillId: string): Skill | undefined => {
    return SKILLS.find((skill) => skill.id === skillId);
};

const resolveSkills = (skills: BattleRobotData["skills"]): Skill[] => {
    if (!Array.isArray(skills)) return [];
    const resolved: Skill[] = [];
    for (const skill of skills) {
        if (typeof skill === "string") {
            const found = getSkillById(skill);
            if (found) resolved.push(found);
            continue;
        }
        if (skill && typeof skill === "object") {
            resolved.push(skill as Skill);
        }
    }
    return resolved;
};

// ============================================
// Main Battle Simulation (ported from functions/src/battleSystem.ts)
// ============================================

const MAX_TURNS = 20;
const toDamage = (value: number): number => Math.max(1, Math.floor(value));
const BASE_DAMAGE_POWER = 100;
const DEFENSE_OFFSET = 100;
const MIN_ATK_DEF_RATIO = 0.3;
const MAX_ATK_DEF_RATIO = 3.5;
const MIN_DAMAGE_RATIO = 0.06;
const MAX_DAMAGE_RATIO = 1.1;
const CRIT_MULTIPLIER = 1.5;
const GUARD_MULTIPLIER = 0.85;
const PURSUIT_SPEED_THRESHOLD = 12;
const PURSUIT_DAMAGE_RATIO = 0.35;
const COUNTER_SPEED_THRESHOLD = 12;
const COUNTER_DAMAGE_RATIO = 0.45;
const COUNTER_DEFENSE_RATIO = 0.9;
const STUN_SPEED_THRESHOLD = 10;
const STUN_DAMAGE_RATIO = 0.18;

const clampValue = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));

const normalizeStats = (attack: number, defense: number): { effectiveAtk: number; effectiveDef: number } => {
    const ratio = attack / Math.max(1, defense);
    let effectiveAtk = attack;
    let effectiveDef = defense;

    if (ratio > MAX_ATK_DEF_RATIO) {
        effectiveAtk = Math.round(defense * MAX_ATK_DEF_RATIO);
    } else if (ratio < MIN_ATK_DEF_RATIO) {
        effectiveDef = Math.round(attack / MIN_ATK_DEF_RATIO);
    }

    return { effectiveAtk, effectiveDef };
};

const computeCoreDamage = (attack: number, defense: number): number => {
    const raw = Math.floor((BASE_DAMAGE_POWER * attack) / (defense + DEFENSE_OFFSET));
    const min = Math.max(1, Math.floor(attack * MIN_DAMAGE_RATIO));
    const max = Math.floor(attack * MAX_DAMAGE_RATIO);
    return clampValue(raw, min, max);
};

const getElementMultiplier = (attacker: BattleRobotData, defender: BattleRobotData): number => {
    const attackerType = attacker.elementType ?? 0;
    const defenderType = defender.elementType ?? 0;
    if (!attackerType || !defenderType || attackerType === defenderType) return 1;

    const advantage = (attackerType % 7) + 1;
    const disadvantage = ((attackerType + 5) % 7) + 1;

    if (defenderType === advantage) return 1.5;
    if (defenderType === disadvantage) return 0.75;
    return 1;
};

/**
 * Simulate a deterministic battle between two robots
 * @param robot1 P1 robot
 * @param robot2 P2 robot
 * @param battleId Seed for determinism (e.g., training_p1id_p2id)
 * @param cheer Cheer reservation input
 * @param battleItems Pre-battle items input
 */
export const simulateBattle = (
    robot1: BattleRobotData,
    robot2: BattleRobotData,
    battleId: string,
    cheer?: CheerInput,
    battleItems?: BattleItemInput
): BattleResult => {
    let hp1 = robot1.baseHp;
    let hp2 = robot2.baseHp;
    const logs: BattleLog[] = [];
    let turn = 1;
    const robot1Skills = resolveSkills(robot1.skills);
    const robot2Skills = resolveSkills(robot2.skills);
    const rng = new SeededRandom(battleId);

    // Initialize overdrive states
    let overdrive1 = createOverdriveState();
    let overdrive2 = createOverdriveState();

    // Pre-calculate stance weights
    const stanceWeights1 = getStanceWeights(robot1);
    const stanceWeights2 = getStanceWeights(robot2);

    // Cheer System: Initialize state
    let p1CheerReady = !!cheer?.p1;
    let p1CheerUsed = false;
    let p2CheerReady = !!cheer?.p2;
    let p2CheerUsed = false;

    const normalizeBattleItem = (item?: BattleItemType | null): BattleItemType | null => {
        if (!item) return null;
        if (item === "CANCEL_CRIT" || item === "DISRUPT") return "JAMMER";
        return item;
    };

    // Pre-Battle Item System: Initialize state
    let p1ItemReady: BattleItemType | null = normalizeBattleItem(battleItems?.p1);
    let p1ItemUsed = false;
    let p2ItemReady: BattleItemType | null = normalizeBattleItem(battleItems?.p2);
    let p2ItemUsed = false;

    // Stun state (skip next action)
    let p1Stunned = false;
    let p2Stunned = false;

    // Track total damage for tiebreaker
    let totalDamageP1 = 0;
    let totalDamageP2 = 0;

    // Determine turn order by speed
    let attacker = robot1.baseSpeed >= robot2.baseSpeed ? robot1 : robot2;
    let defender = robot1.baseSpeed >= robot2.baseSpeed ? robot2 : robot1;
    let attackerHp = robot1.baseSpeed >= robot2.baseSpeed ? hp1 : hp2;
    let defenderHp = robot1.baseSpeed >= robot2.baseSpeed ? hp2 : hp1;
    let attackerSkills = robot1.baseSpeed >= robot2.baseSpeed ? robot1Skills : robot2Skills;
    let defenderSkills = robot1.baseSpeed >= robot2.baseSpeed ? robot2Skills : robot1Skills;

    const getOverdrive = (robotId: string | undefined) => robotId === robot1.id ? overdrive1 : overdrive2;
    const setOverdrive = (robotId: string | undefined, state: OverdriveState) => {
        if (robotId === robot1.id) overdrive1 = state;
        else overdrive2 = state;
    };

    while (hp1 > 0 && hp2 > 0 && turn <= MAX_TURNS) {
        // Pre-Battle Item System: Initialize turn item state
        let itemApplied = false;
        let itemSide: 'P1' | 'P2' | undefined;
        let itemType: BattleItemType | undefined;
        let itemEffect: string | undefined;
        let itemEvent: "ITEM_USED" | "ITEM_APPLIED" | undefined;
        let itemMessage: string | undefined;

        const attackerWasStunned = attacker.id === robot1.id ? p1Stunned : p2Stunned;
        if (attackerWasStunned) {
            if (attacker.id === robot1.id) p1Stunned = false;
            else p2Stunned = false;

            logs.push({
                turn,
                attackerId: attacker.id!,
                defenderId: defender.id!,
                action: 'stunned',
                damage: 0,
                isCritical: false,
                attackerHp: Math.max(0, attackerHp),
                defenderHp: Math.max(0, defenderHp),
                message: `${attacker.name}はスタン中で動けない！`,
                attackerOverdriveGauge: Math.floor(getOverdrive(attacker.id).gauge),
                defenderOverdriveGauge: Math.floor(getOverdrive(defender.id).gauge),
                stunned: true,
            });

            // Swap attacker/defender
            const tempRobot = attacker;
            attacker = defender;
            defender = tempRobot;
            const tempSkills = attackerSkills;
            attackerSkills = defenderSkills;
            defenderSkills = tempSkills;
            const tempHp = attackerHp;
            attackerHp = defenderHp;
            defenderHp = tempHp;
            turn++;
            continue;
        }

        // Stance Resolution
        const attackerWeights = attacker.id === robot1.id ? stanceWeights1 : stanceWeights2;
        const defenderWeights = defender.id === robot1.id ? stanceWeights1 : stanceWeights2;

        const attackerStance = pickStance(rng, attackerWeights);
        const defenderStance = pickStance(rng, defenderWeights);
        const stanceOutcome = resolveStance(attackerStance, defenderStance);
        const stanceMultiplier = getStanceMultiplier(stanceOutcome, true);

        // Overdrive Check
        let overdriveTriggered = false;
        let overdriveMessage: string | undefined;

        const attackerOverdrive = getOverdrive(attacker.id);
        const odResult = tickOverdrive(attackerOverdrive);
        if (odResult.triggered) {
            overdriveTriggered = true;
            overdriveMessage = `${attacker.name} ${odResult.message}`;
        }
        setOverdrive(attacker.id, odResult.newState);

        // Pre-Battle Item System: Initialize turn item state
        // (Moved to top of loop in previous edit)

        let damage = 0;
        let isCritical = false;
        let action: 'attack' | 'skill' = 'attack';
        let skillName: string | undefined = undefined;
        let message = "";
        let passiveTriggered: PassiveTrigger | undefined;
        const elementMultiplier = getElementMultiplier(attacker, defender);
        const speedDiff = attacker.baseSpeed - defender.baseSpeed;
        const reasonTags: string[] = [];
        if (elementMultiplier > 1) reasonTags.push("属性有利");
        else if (elementMultiplier < 1) reasonTags.push("属性不利");

        let atk = attacker.baseAttack;
        let def = defender.baseDefense;

        // Pre-attack Passives (Weapon)
        const weaponPassive = checkPassive(rng, attacker, "weapon");
        if (weaponPassive) {
            passiveTriggered = weaponPassive;
            const effect = getPassiveEffect(weaponPassive);

            if (effect.damageMultiplier) {
                atk = Math.floor(atk * effect.damageMultiplier);
            }
            if (effect.defenseMultiplier) {
                def = Math.floor(def * effect.defenseMultiplier);
            }
        }

        const { effectiveAtk, effectiveDef } = normalizeStats(atk, def);
        const coreDamage = computeCoreDamage(effectiveAtk, effectiveDef);

        // Skill trigger check
        let skill: Skill | null = null;
        const overdriveActive = odResult.newState.isActive;
        const triggerBonus = getOverdriveTriggerBonus(overdriveActive);

        if (attackerSkills.length > 0) {
            for (const s of attackerSkills) {
                const effectiveTriggerRate = Math.min(1.0, s.triggerRate + triggerBonus);
                if (rng.next() < effectiveTriggerRate) {
                    skill = s;
                    break;
                }
            }
        }

        const overdriveSkillMult = getOverdriveSkillMultiplier(overdriveActive);

        if (skill) {
            action = 'skill';
            skillName = skill.name;

            switch (skill.type) {
                case 'attack':
                    const baseDamage = coreDamage;
                    damage = toDamage(baseDamage * skill.power * elementMultiplier * stanceMultiplier * overdriveSkillMult);
                    message = `${attacker.name} uses ${skill.name}! Dealt ${damage} damage!`;
                    break;
                case 'heal':
                    const healAmount = Math.floor(attacker.baseHp * skill.power * overdriveSkillMult);
                    if (attacker.id === robot1.id) {
                        hp1 = Math.min(robot1.baseHp, hp1 + healAmount);
                        attackerHp = hp1;
                    } else {
                        hp2 = Math.min(robot2.baseHp, hp2 + healAmount);
                        attackerHp = hp2;
                    }
                    message = `${attacker.name} uses ${skill.name}! Recovered ${healAmount} HP!`;
                    damage = 0;
                    break;
                default:
                    const bonusDamage = Math.floor(coreDamage * 0.5);
                    damage = toDamage(bonusDamage * elementMultiplier * stanceMultiplier * overdriveSkillMult);
                    message = `${attacker.name} uses ${skill.name}! Dealt ${damage} damage!`;
                    break;
            }
        } else {
            // Normal attack
            // 通常攻撃 - New Damage Formula (Defense-Weighted)
            // core = floor(BASE_DAMAGE_POWER * atk / (def + DEFENSE_OFFSET))
            // variance = 0.90..1.10
            // damage = max(1, floor(core * variance))
            const variance = 0.90 + rng.next() * 0.20; // 0.90 to 1.10
            const baseDamage = Math.max(1, Math.floor(coreDamage * variance));

            // クリティカル判定 - Speed-based formula
            // critChance = clamp(0.05 + (spd - oppSpd)*0.002, 0.05, 0.25)
            let critChance = Math.max(0.05, Math.min(0.25, 0.05 + speedDiff * 0.002));

            if (weaponPassive) {
                const effect = getPassiveEffect(weaponPassive);
                if (effect.critBonus) {
                    critChance = Math.min(0.25, critChance + effect.critBonus);
                }
            }

            isCritical = rng.next() < critChance;

            // JAMMER Item: Nullify critical (post-RNG, deterministic)
            if (isCritical) {
                if (defender.id === robot1.id && p1ItemReady === 'JAMMER' && !p1ItemUsed) {
                    isCritical = false;
                    p1ItemReady = null;
                    p1ItemUsed = true;
                    itemApplied = true;
                    itemSide = 'P1';
                    itemType = 'JAMMER';
                    itemEffect = 'Crit Cancelled';
                    itemEvent = "ITEM_USED";
                    itemMessage = " 🤞ジャマーがクリティカルを防いだ！";
                } else if (defender.id === robot2.id && p2ItemReady === 'JAMMER' && !p2ItemUsed) {
                    isCritical = false;
                    p2ItemReady = null;
                    p2ItemUsed = true;
                    itemApplied = true;
                    itemSide = 'P2';
                    itemType = 'JAMMER';
                    itemEffect = 'Crit Cancelled';
                    itemEvent = "ITEM_USED";
                    itemMessage = " 🤞ジャマーがクリティカルを防いだ！";
                }
            }

            if (isCritical) reasonTags.push("クリティカル");

            // Apply element and stance multipliers (variance already in baseDamage)
            damage = toDamage(baseDamage * elementMultiplier * stanceMultiplier);
            if (isCritical) damage = toDamage(damage * CRIT_MULTIPLIER);
            message = `${attacker.name} attacks ${defender.name} for ${damage} damage!`;
        }

        // Guard stance: additional reduction when defender guards
        let guardApplied = false;
        if (damage > 0 && defenderStance === "GUARD") {
            damage = toDamage(damage * GUARD_MULTIPLIER);
            guardApplied = true;
            reasonTags.push("ガードで軽減");
        }

        // Defender Passives (Accessory - damage reduction)
        if (damage > 0 && !passiveTriggered) {
            const accessoryPassive = checkPassive(rng, defender, "accessory");
            if (accessoryPassive) {
                passiveTriggered = accessoryPassive;
                const effect = getPassiveEffect(accessoryPassive);

                if (effect.damageReduction) {
                    damage = toDamage(damage * effect.damageReduction);
                    message += ` (${accessoryPassive.effectName} reduced damage!)`;
                }
            }
        }

        // Cheer System: Apply 1.2x multiplier
        let cheerApplied = false;
        let cheerSide: 'P1' | 'P2' | undefined;
        const cheerMultiplier = 1.2;

        if (attacker.id === robot1.id && p1CheerReady && !p1CheerUsed && damage > 0) {
            damage = toDamage(damage * cheerMultiplier);
            p1CheerReady = false;
            p1CheerUsed = true;
            cheerApplied = true;
            cheerSide = 'P1';
            message += ` 🎉声援が刃になった（×${cheerMultiplier}）`;
        } else if (attacker.id === robot2.id && p2CheerReady && !p2CheerUsed && damage > 0) {
            damage = toDamage(damage * cheerMultiplier);
            p2CheerReady = false;
            p2CheerUsed = true;
            cheerApplied = true;
            cheerSide = 'P2';
            message += ` 🎉声援が刃になった（×${cheerMultiplier}）`;
        }

        // Pre-Battle Item System: Apply items (AFTER cheer)
        // Variables initialized at loop start

        const BOOST_MULTIPLIER = 1.15;
        const SHIELD_MULTIPLIER = 0.85;

        // BOOST: Attacker's first attack ×1.15
        if (damage > 0) {
            if (attacker.id === robot1.id && p1ItemReady === 'BOOST' && !p1ItemUsed) {
                damage = toDamage(damage * BOOST_MULTIPLIER);
                p1ItemReady = null;
                p1ItemUsed = true;
                itemApplied = true;
                itemSide = 'P1';
                itemType = 'BOOST';
                itemEffect = `×${BOOST_MULTIPLIER}`;
                itemEvent = "ITEM_APPLIED";
                itemMessage = ` ⚡ブーストアイテム発動！（${itemEffect}）`;
            } else if (attacker.id === robot2.id && p2ItemReady === 'BOOST' && !p2ItemUsed) {
                damage = toDamage(damage * BOOST_MULTIPLIER);
                p2ItemReady = null;
                p2ItemUsed = true;
                itemApplied = true;
                itemSide = 'P2';
                itemType = 'BOOST';
                itemEffect = `×${BOOST_MULTIPLIER}`;
                itemEvent = "ITEM_APPLIED";
                itemMessage = ` ⚡ブーストアイテム発動！（${itemEffect}）`;
            }
        }

        // SHIELD: Defender's first damage ×0.85
        if (damage > 0 && !itemApplied) {
            if (defender.id === robot1.id && p1ItemReady === 'SHIELD' && !p1ItemUsed) {
                damage = toDamage(damage * SHIELD_MULTIPLIER);
                p1ItemReady = null;
                p1ItemUsed = true;
                itemApplied = true;
                itemSide = 'P1';
                itemType = 'SHIELD';
                itemEffect = `×${SHIELD_MULTIPLIER}`;
                itemEvent = "ITEM_APPLIED";
                itemMessage = ` 🛡️シールドアイテム発動！（${itemEffect}）`;
            } else if (defender.id === robot2.id && p2ItemReady === 'SHIELD' && !p2ItemUsed) {
                damage = toDamage(damage * SHIELD_MULTIPLIER);
                p2ItemReady = null;
                p2ItemUsed = true;
                itemApplied = true;
                itemSide = 'P2';
                itemType = 'SHIELD';
                itemEffect = `×${SHIELD_MULTIPLIER}`;
                itemEvent = "ITEM_APPLIED";
                itemMessage = ` 🛡️シールドアイテム発動！（${itemEffect}）`;
            }
        }

        // HP reduction
        let followUpDamage = 0;
        let pursuitDamage = 0;
        let stunApplied = false;
        let counterDamage = 0;
        let counterMessage = "";

        if (damage > 0) {
            if (attacker.id === robot1.id) {
                hp2 -= damage;
                defenderHp = hp2;
                totalDamageP1 += damage; // Track P1's damage

                const defOverdrive = getOverdrive(defender.id);
                const stanceLost = stanceOutcome === "WIN";
                setOverdrive(defender.id, addOverdrive(defOverdrive, damage, robot2.baseHp, stanceLost));
            } else {
                hp1 -= damage;
                defenderHp = hp1;
                totalDamageP2 += damage; // Track P2's damage

                const defOverdrive = getOverdrive(defender.id);
                const stanceLost = stanceOutcome === "WIN";
                setOverdrive(defender.id, addOverdrive(defOverdrive, damage, robot1.baseHp, stanceLost));
            }

            // Speed-based pursuit (追撃)
            if (speedDiff >= PURSUIT_SPEED_THRESHOLD) {
                pursuitDamage = toDamage(damage * PURSUIT_DAMAGE_RATIO);
                followUpDamage += pursuitDamage;
                if (attacker.id === robot1.id) {
                    hp2 -= pursuitDamage;
                    defenderHp = hp2;
                    totalDamageP1 += pursuitDamage;
                } else {
                    hp1 -= pursuitDamage;
                    defenderHp = hp1;
                    totalDamageP2 += pursuitDamage;
                }
                reasonTags.push("速度差で追撃");
                message += ` 追撃で${pursuitDamage}ダメージ！`;
            }

            // Post-attack Passives (Backpack)
            if (!passiveTriggered) {
                const backpackPassive = checkPassive(rng, attacker, "backpack");
                if (backpackPassive) {
                    passiveTriggered = backpackPassive;
                    const effect = getPassiveEffect(backpackPassive);

                    if (effect.followUpDamage) {
                        const passiveFollowUpDamage = toDamage(effectiveAtk * effect.followUpDamage);
                        followUpDamage += passiveFollowUpDamage;
                        if (attacker.id === robot1.id) {
                            hp2 -= passiveFollowUpDamage;
                            defenderHp = hp2;
                            totalDamageP1 += passiveFollowUpDamage; // Track P1's followup damage
                        } else {
                            hp1 -= passiveFollowUpDamage;
                            defenderHp = hp1;
                            totalDamageP2 += passiveFollowUpDamage; // Track P2's followup damage
                        }
                        message += ` ${backpackPassive.effectName}で${passiveFollowUpDamage}追撃！`;
                    }

                    if (effect.healRatio) {
                        const healVal = Math.floor((damage + followUpDamage) * effect.healRatio);
                        if (attacker.id === robot1.id) {
                            hp1 = Math.min(robot1.baseHp, hp1 + healVal);
                            attackerHp = hp1;
                        } else {
                            hp2 = Math.min(robot2.baseHp, hp2 + healVal);
                            attackerHp = hp2;
                        }
                        message += ` (Recovered ${healVal} HP!)`;
                    }
                }
            }
        }

        const totalHitDamage = damage + followUpDamage;
        if (damage > 0 && defenderHp > 0 && speedDiff >= STUN_SPEED_THRESHOLD) {
            if (totalHitDamage >= defender.baseHp * STUN_DAMAGE_RATIO) {
                stunApplied = true;
                if (defender.id === robot1.id) p1Stunned = true;
                else p2Stunned = true;
                reasonTags.push("スタン");
                message += ` スタン！次のターン行動不能`;
            }
        }

        if (damage > 0 && defenderHp > 0 && !stunApplied) {
            const defenderFaster = speedDiff <= -COUNTER_SPEED_THRESHOLD;
            const defenderTanky = def >= atk * COUNTER_DEFENSE_RATIO;
            if (defenderFaster && defenderTanky) {
                const counterAtk = defender.baseAttack;
                const counterDef = attacker.baseDefense;
                const { effectiveAtk: counterEffectiveAtk, effectiveDef: counterEffectiveDef } = normalizeStats(counterAtk, counterDef);
                const counterCoreDamage = computeCoreDamage(counterEffectiveAtk, counterEffectiveDef);
                const counterElementMultiplier = getElementMultiplier(defender, attacker);
                counterDamage = toDamage(counterCoreDamage * COUNTER_DAMAGE_RATIO * counterElementMultiplier);
                if (counterDamage > 0) {
                    counterMessage = `${defender.name}の反撃！ ${counterDamage}ダメージ！`;
                }
            }
        }

        const stanceInfo = stanceOutcome === "WIN"
            ? `[読み勝ち:${attackerStance}>${defenderStance}]`
            : stanceOutcome === "LOSE"
                ? `[読み負け:${attackerStance}<${defenderStance}]`
                : `[読み合い:${attackerStance}]`;

        const reasonNote = reasonTags.length ? `（${reasonTags.join("・")}）` : "";
        const messageWithReasons = reasonNote ? `${message} ${reasonNote}` : message;

        if (overdriveTriggered) {
            message = `🔥 OVERDRIVE! ` + messageWithReasons;
        } else {
            message = messageWithReasons;
        }

        logs.push({
            turn,
            attackerId: attacker.id!,
            defenderId: defender.id!,
            action,
            skillName,
            damage: damage + followUpDamage,
            isCritical,
            attackerHp: Math.max(0, attackerHp),
            defenderHp: Math.max(0, defenderHp),
            message: `${stanceInfo} ${message}`.trim(),
            stanceAttacker: attackerStance,
            stanceDefender: defenderStance,
            stanceOutcome,
            stanceMultiplier,
            overdriveTriggered,
            overdriveMessage,
            attackerOverdriveGauge: Math.floor(getOverdrive(attacker.id).gauge),
            defenderOverdriveGauge: Math.floor(getOverdrive(defender.id).gauge),
            passiveTriggered,
            guarded: guardApplied || undefined,
            guardMultiplier: guardApplied ? GUARD_MULTIPLIER : undefined,
            pursuitDamage: pursuitDamage || undefined,
            followUpDamage: followUpDamage || undefined,
            stunApplied: stunApplied || undefined,
            stunTargetId: stunApplied ? defender.id : undefined,
            cheerApplied: cheerApplied || undefined,
            cheerSide: cheerSide,
            cheerMultiplier: cheerApplied ? cheerMultiplier : undefined,
            // Pre-Battle Item System
            itemApplied: itemApplied || undefined,
            itemSide: itemSide,
            itemType: itemType,
            itemEffect: itemEffect,
            itemEvent: itemEvent,
            itemMessage: itemMessage,
        });

        if (counterDamage > 0) {
            const counterAttackerHp = defenderHp;
            if (attacker.id === robot1.id) {
                hp1 -= counterDamage;
                attackerHp = hp1;
                totalDamageP2 += counterDamage;
            } else {
                hp2 -= counterDamage;
                attackerHp = hp2;
                totalDamageP1 += counterDamage;
            }

            const damagedOverdrive = getOverdrive(attacker.id);
            const damagedMaxHp = attacker.id === robot1.id ? robot1.baseHp : robot2.baseHp;
            setOverdrive(attacker.id, addOverdrive(damagedOverdrive, counterDamage, damagedMaxHp, false));

            logs.push({
                turn,
                attackerId: defender.id!,
                defenderId: attacker.id!,
                action: 'counter',
                damage: counterDamage,
                isCritical: false,
                attackerHp: Math.max(0, counterAttackerHp),
                defenderHp: Math.max(0, attackerHp),
                message: counterMessage,
            });
        }

        if (hp1 <= 0 || hp2 <= 0) break;

        // Swap attacker/defender
        const tempRobot = attacker;
        attacker = defender;
        defender = tempRobot;
        const tempSkills = attackerSkills;
        attackerSkills = defenderSkills;
        defenderSkills = tempSkills;
        const tempHp = attackerHp;
        attackerHp = defenderHp;
        defenderHp = tempHp;
        turn++;
    }

    let winnerId: string;
    let loserId: string;

    if (hp1 <= 0 || hp2 <= 0) {
        // One robot is KO'd
        winnerId = (hp1 > 0 ? robot1.id : robot2.id)!;
        loserId = (hp1 > 0 ? robot2.id : robot1.id)!;
    } else {
        // Turn limit reached - apply tiebreaker logic
        // 1. Higher remaining HP
        if (hp1 > hp2) {
            winnerId = robot1.id!;
            loserId = robot2.id!;
        } else if (hp2 > hp1) {
            winnerId = robot2.id!;
            loserId = robot1.id!;
        } else {
            // 2. Equal HP - check total damage dealt
            if (totalDamageP1 > totalDamageP2) {
                winnerId = robot1.id!;
                loserId = robot2.id!;
            } else if (totalDamageP2 > totalDamageP1) {
                winnerId = robot2.id!;
                loserId = robot1.id!;
            } else {
                // 3. Equal damage - check speed
                if (robot1.baseSpeed > robot2.baseSpeed) {
                    winnerId = robot1.id!;
                    loserId = robot2.id!;
                } else if (robot2.baseSpeed > robot1.baseSpeed) {
                    winnerId = robot2.id!;
                    loserId = robot1.id!;
                } else {
                    // 4. All equal - P1 wins (deterministic)
                    winnerId = robot1.id!;
                    loserId = robot2.id!;
                }
            }
        }
    }

    return {
        winnerId,
        loserId,
        logs,
        rewards: {
            exp: 0,
            coins: 0
        },
        totalDamageP1,
        totalDamageP2,
        turnCount: turn - 1,
    };
};

/**
 * Normalize a pair of robot IDs to a consistent order (lexicographic)
 * This ensures the same two robots always produce the same battle ID
 * @returns { a: smaller ID, b: larger ID }
 */
export const normalizePair = (id1: string, id2: string): { a: string; b: string } => {
    if (id1 <= id2) {
        return { a: id1, b: id2 };
    }
    return { a: id2, b: id1 };
};

/**
 * Convert Firestore RobotData to BattleRobotData
 */
export const toBattleRobotData = (robot: any): BattleRobotData => {
    return {
        id: robot.id,
        name: robot.name,
        sourceBarcode: robot.sourceBarcode,
        baseHp: robot.baseHp,
        baseAttack: robot.baseAttack,
        baseDefense: robot.baseDefense,
        baseSpeed: robot.baseSpeed,
        elementType: robot.elementType,
        elementName: robot.elementName,
        parts: robot.parts,
        colors: robot.colors,
        skills: robot.skills,
    };
};

/**
 * Generate a deterministic training battle ID using normalized order
 * Same two robots will always produce the same battle ID regardless of input order
 */
export const getTrainingBattleId = (p1RobotId: string, p2RobotId: string): string => {
    const { a, b } = normalizePair(p1RobotId, p2RobotId);
    return `training_${a}_${b}`;
};

/**
 * Normalize robots and cheer for training battle
 * Ensures consistent input order to the battle engine
 * @returns Normalized robots (p1=a, p2=b) and adjusted cheer
 */
export const normalizeTrainingInput = <T extends { id?: string }>(
    robot1: T,
    robot2: T,
    cheer?: CheerInput
): { p1: T; p2: T; normalizedCheer: CheerInput | undefined } => {
    const id1 = robot1.id || '';
    const id2 = robot2.id || '';

    if (id1 <= id2) {
        // Already in normalized order
        return { p1: robot1, p2: robot2, normalizedCheer: cheer };
    }

    // Swap robots and cheer assignments
    return {
        p1: robot2,
        p2: robot1,
        normalizedCheer: cheer ? { p1: cheer.p2, p2: cheer.p1 } : undefined
    };
};
