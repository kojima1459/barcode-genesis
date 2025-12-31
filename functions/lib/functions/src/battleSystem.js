"use strict";
/**
 * BattleEngine v2: Full Battle System
 * Integrates Stance, Overdrive, and Part Passives
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateBattle = void 0;
const skills_1 = require("./skills");
const seededRandom_1 = require("./seededRandom");
const battleStance_1 = require("./battleStance");
const battleOverdrive_1 = require("./battleOverdrive");
const battlePassives_1 = require("./battlePassives");
const levelSystem_1 = require("./levelSystem");
const resolveSkills = (skills) => {
    if (!Array.isArray(skills))
        return [];
    const resolved = [];
    for (const skill of skills) {
        if (typeof skill === "string") {
            const found = (0, skills_1.getSkillById)(skill);
            if (found)
                resolved.push(found);
            continue;
        }
        if (skill && typeof skill === "object") {
            resolved.push(skill);
        }
    }
    return resolved;
};
const MAX_TURNS = 20;
const toDamage = (value) => Math.max(1, Math.floor(value));
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
const clampValue = (value, min, max) => Math.max(min, Math.min(max, value));
const normalizeStats = (attack, defense) => {
    const ratio = attack / Math.max(1, defense);
    let effectiveAtk = attack;
    let effectiveDef = defense;
    if (ratio > MAX_ATK_DEF_RATIO) {
        effectiveAtk = Math.round(defense * MAX_ATK_DEF_RATIO);
    }
    else if (ratio < MIN_ATK_DEF_RATIO) {
        effectiveDef = Math.round(attack / MIN_ATK_DEF_RATIO);
    }
    return { effectiveAtk, effectiveDef };
};
const computeCoreDamage = (attack, defense) => {
    const raw = Math.floor((BASE_DAMAGE_POWER * attack) / (defense + DEFENSE_OFFSET));
    const min = Math.max(1, Math.floor(attack * MIN_DAMAGE_RATIO));
    const max = Math.floor(attack * MAX_DAMAGE_RATIO);
    return clampValue(raw, min, max);
};
const getElementMultiplier = (attacker, defender) => {
    var _a, _b;
    const attackerType = (_a = attacker.elementType) !== null && _a !== void 0 ? _a : 0;
    const defenderType = (_b = defender.elementType) !== null && _b !== void 0 ? _b : 0;
    if (!attackerType || !defenderType || attackerType === defenderType)
        return 1;
    // Use a simple cyclic order (1->2->...->7->1) for advantage/weakness.
    const advantage = (attackerType % 7) + 1;
    const disadvantage = ((attackerType + 5) % 7) + 1;
    if (defenderType === advantage)
        return 1.5;
    if (defenderType === disadvantage)
        return 0.75;
    return 1;
};
const SPECIAL_MOVES = {
    ATTACKER: {
        type: 'PIERCING_ASSAULT',
        name: '貫通強襲',
        roleJa: 'アタッカー',
        damageMultiplier: 1.8,
        defPenetration: 0.3,
        healRatio: 0,
        damageReduction: 0,
        hitCount: 1,
        stunChance: 0,
        guaranteedCrit: false,
    },
    TANK: {
        type: 'IRON_FORTRESS',
        name: '鉄壁の盾',
        roleJa: 'タンク',
        damageMultiplier: 0.8,
        defPenetration: 0,
        healRatio: 0.15,
        damageReduction: 0.5,
        hitCount: 1,
        stunChance: 0,
        guaranteedCrit: false,
    },
    SPEED: {
        type: 'RAPID_COMBO',
        name: '連撃乱舞',
        roleJa: 'スピード',
        damageMultiplier: 1.5,
        defPenetration: 0,
        healRatio: 0,
        damageReduction: 0,
        hitCount: 3,
        stunChance: 0,
        guaranteedCrit: false,
    },
    BALANCE: {
        type: 'ADAPTIVE_STRIKE',
        name: '適応一撃',
        roleJa: 'バランス',
        damageMultiplier: 1.4,
        defPenetration: 0,
        healRatio: 0,
        damageReduction: 0,
        hitCount: 1,
        stunChance: 0,
        guaranteedCrit: true,
    },
    TRICKY: {
        type: 'CHAOS_DISRUPT',
        name: '混沌撹乱',
        roleJa: 'トリッキー',
        damageMultiplier: 1.6,
        defPenetration: 0,
        healRatio: 0,
        damageReduction: 0,
        hitCount: 1,
        stunChance: 0.5,
        guaranteedCrit: false,
    },
};
const getSpecialMove = (role) => {
    var _a;
    if (!role)
        return null;
    return (_a = SPECIAL_MOVES[role]) !== null && _a !== void 0 ? _a : null;
};
const simulateBattle = (robot1, robot2, battleId, robot1Items = [], cheer, battleItems, specialInput // NEW: Special move input (optional, backward compatible)
) => {
    var _a, _b, _c, _d;
    // Level-based stat scaling
    const level1 = (_a = robot1.level) !== null && _a !== void 0 ? _a : 1;
    const level2 = (_b = robot2.level) !== null && _b !== void 0 ? _b : 1;
    const levelMult1 = (0, levelSystem_1.getLevelMultiplier)(level1);
    const levelMult2 = (0, levelSystem_1.getLevelMultiplier)(level2);
    // Max HP with level scaling
    const maxHp1 = Math.floor(robot1.baseHp * levelMult1);
    const maxHp2 = Math.floor(robot2.baseHp * levelMult2);
    let hp1 = maxHp1;
    let hp2 = maxHp2;
    const logs = [];
    let turn = 1;
    const robot1Skills = resolveSkills(robot1.skills);
    const robot2Skills = resolveSkills(robot2.skills);
    const rng = new seededRandom_1.SeededRandom(battleId !== null && battleId !== void 0 ? battleId : `${(_c = robot1.id) !== null && _c !== void 0 ? _c : "robot1"}-${(_d = robot2.id) !== null && _d !== void 0 ? _d : "robot2"}`);
    // BattleEngine v2: Initialize overdrive states
    let overdrive1 = (0, battleOverdrive_1.createOverdriveState)();
    let overdrive2 = (0, battleOverdrive_1.createOverdriveState)();
    // BattleEngine v2: Pre-calculate stance weights
    const stanceWeights1 = (0, battleStance_1.getStanceWeights)(robot1);
    const stanceWeights2 = (0, battleStance_1.getStanceWeights)(robot2);
    // アイテム使用フラグ (legacy items)
    let usedRepairKit = false;
    // Cheer System: Initialize state
    let p1CheerReady = !!(cheer === null || cheer === void 0 ? void 0 : cheer.p1);
    let p1CheerUsed = false;
    let p2CheerReady = !!(cheer === null || cheer === void 0 ? void 0 : cheer.p2);
    let p2CheerUsed = false;
    const normalizeBattleItem = (item) => {
        if (!item)
            return null;
        if (item === "CANCEL_CRIT" || item === "DISRUPT")
            return "JAMMER";
        return item;
    };
    // Pre-Battle Item System: Initialize state
    let p1ItemReady = normalizeBattleItem(battleItems === null || battleItems === void 0 ? void 0 : battleItems.p1);
    let p1ItemUsed = false;
    let p2ItemReady = normalizeBattleItem(battleItems === null || battleItems === void 0 ? void 0 : battleItems.p2);
    let p2ItemUsed = false;
    // Stun state (skip next action)
    let p1Stunned = false;
    let p2Stunned = false;
    // Special Move System: Initialize state (once per battle)
    let p1SpecialUsed = false;
    let p2SpecialUsed = false;
    const p1SpecialRequested = !!(specialInput === null || specialInput === void 0 ? void 0 : specialInput.p1Used);
    const p2SpecialRequested = !!(specialInput === null || specialInput === void 0 ? void 0 : specialInput.p2Used);
    // Track total damage for tiebreaker
    let totalDamageP1 = 0;
    let totalDamageP2 = 0;
    // ステータス補正関数 (includes level multiplier)
    const getStat = (robot, stat) => {
        const levelMult = robot.id === robot1.id ? levelMult1 : levelMult2;
        let val = robot[stat] * levelMult;
        if (robot.id === robot1.id) {
            if (stat === 'baseAttack' && robot1Items.includes('attack_boost'))
                val *= 1.2;
            if (stat === 'baseDefense' && robot1Items.includes('defense_boost'))
                val *= 1.2;
        }
        return Math.floor(val);
    };
    // 素早さ (with level scaling for fair first-strike determination)
    const effectiveSpeed1 = Math.floor(robot1.baseSpeed * levelMult1);
    const effectiveSpeed2 = Math.floor(robot2.baseSpeed * levelMult2);
    // 素早さで先攻後攻を決定 (using effective speed with level scaling)
    let attacker = effectiveSpeed1 >= effectiveSpeed2 ? robot1 : robot2;
    let defender = effectiveSpeed1 >= effectiveSpeed2 ? robot2 : robot1;
    let attackerHp = effectiveSpeed1 >= effectiveSpeed2 ? hp1 : hp2;
    let defenderHp = effectiveSpeed1 >= effectiveSpeed2 ? hp2 : hp1;
    let attackerSkills = effectiveSpeed1 >= effectiveSpeed2 ? robot1Skills : robot2Skills;
    let defenderSkills = effectiveSpeed1 >= effectiveSpeed2 ? robot2Skills : robot1Skills;
    // Helper to get scaled max HP for a robot
    const getMaxHp = (robot) => {
        return robot.id === robot1.id ? maxHp1 : maxHp2;
    };
    // Track which robot is which for overdrive
    const getOverdrive = (robotId) => robotId === robot1.id ? overdrive1 : overdrive2;
    const setOverdrive = (robotId, state) => {
        if (robotId === robot1.id)
            overdrive1 = state;
        else
            overdrive2 = state;
    };
    // 最大30ターンで決着をつける
    while (hp1 > 0 && hp2 > 0 && turn <= MAX_TURNS) {
        // ============================================
        // BattleEngine v2: STANCE RESOLUTION
        // ============================================
        // Pre-Battle Item System: Initialize turn item state
        let itemApplied = false;
        let itemSide;
        let itemType;
        let itemEffect;
        let itemEvent;
        let itemMessage;
        const attackerWasStunned = attacker.id === robot1.id ? p1Stunned : p2Stunned;
        if (attackerWasStunned) {
            if (attacker.id === robot1.id)
                p1Stunned = false;
            else
                p2Stunned = false;
            logs.push({
                turn,
                attackerId: attacker.id,
                defenderId: defender.id,
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
            // 攻守交代
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
        const attackerWeights = attacker.id === robot1.id ? stanceWeights1 : stanceWeights2;
        const defenderWeights = defender.id === robot1.id ? stanceWeights1 : stanceWeights2;
        const attackerStance = (0, battleStance_1.pickStance)(rng, attackerWeights);
        const defenderStance = (0, battleStance_1.pickStance)(rng, defenderWeights);
        const stanceOutcome = (0, battleStance_1.resolveStance)(attackerStance, defenderStance);
        const stanceMultiplier = (0, battleStance_1.getStanceMultiplier)(stanceOutcome, true);
        // ============================================
        // BattleEngine v2: OVERDRIVE CHECK
        // ============================================
        let overdriveTriggered = false;
        let overdriveMessage;
        const attackerOverdrive = getOverdrive(attacker.id);
        const odResult = (0, battleOverdrive_1.tickOverdrive)(attackerOverdrive);
        if (odResult.triggered) {
            overdriveTriggered = true;
            overdriveMessage = `${attacker.name} ${odResult.message}`;
        }
        setOverdrive(attacker.id, odResult.newState);
        // Repair Kit チェック (Robot 1 only) - ターン開始時に発動
        if (robot1Items.includes('repair_kit') && !usedRepairKit && hp1 < maxHp1 * 0.5) {
            const healAmount = Math.floor(maxHp1 * 0.3);
            hp1 = Math.min(maxHp1, hp1 + healAmount);
            usedRepairKit = true;
            logs.push({
                turn,
                attackerId: robot1.id,
                defenderId: robot1.id,
                action: 'item',
                damage: 0,
                isCritical: false,
                attackerHp: hp1,
                defenderHp: hp2,
                message: `${robot1.name} uses Repair Kit! Recovered ${healAmount} HP!`,
                stanceAttacker: attackerStance,
                stanceDefender: defenderStance,
                stanceOutcome,
                attackerOverdriveGauge: overdrive1.gauge,
                defenderOverdriveGauge: overdrive2.gauge,
            });
            // HP更新
            if (attacker.id === robot1.id)
                attackerHp = hp1;
            else
                defenderHp = hp1;
        }
        let damage = 0;
        let isCritical = false;
        let action = 'attack';
        let skillName = undefined;
        let message = "";
        let passiveTriggered;
        const elementMultiplier = getElementMultiplier(attacker, defender);
        const speedDiff = attacker.baseSpeed - defender.baseSpeed;
        const reasonTags = [];
        if (elementMultiplier > 1)
            reasonTags.push("属性有利");
        else if (elementMultiplier < 1)
            reasonTags.push("属性不利");
        let atk = getStat(attacker, 'baseAttack');
        let def = getStat(defender, 'baseDefense');
        // ============================================
        // BattleEngine v2: PRE-ATTACK PASSIVES (Weapon)
        // ============================================
        const weaponPassive = (0, battlePassives_1.checkPassive)(rng, attacker, "weapon");
        if (weaponPassive) {
            passiveTriggered = weaponPassive;
            const effect = (0, battlePassives_1.getPassiveEffect)(weaponPassive);
            // Apply damage multiplier
            if (effect.damageMultiplier) {
                atk = Math.floor(atk * effect.damageMultiplier);
            }
            // Apply defense penetration
            if (effect.defenseMultiplier) {
                def = Math.floor(def * effect.defenseMultiplier);
            }
        }
        // ============================================
        // Special Move System (必殺技)
        // ============================================
        let specialTriggered = false;
        let specialName;
        let specialRoleName;
        let specialImpact;
        let specialHits = 1;
        let specialDamageMultiplier = 1.0;
        let specialGuaranteedCrit = false;
        let specialStunChance = 0;
        let specialHealAmount = 0;
        // Check if attacker should use special (first opportunity, once per battle)
        const isP1Attacker = attacker.id === robot1.id;
        const shouldUseSpecial = isP1Attacker
            ? (p1SpecialRequested && !p1SpecialUsed)
            : (p2SpecialRequested && !p2SpecialUsed);
        if (shouldUseSpecial) {
            const specialMove = getSpecialMove(attacker.role);
            if (specialMove) {
                // Mark as used
                if (isP1Attacker)
                    p1SpecialUsed = true;
                else
                    p2SpecialUsed = true;
                specialTriggered = true;
                specialName = specialMove.name;
                specialRoleName = specialMove.roleJa;
                specialDamageMultiplier = specialMove.damageMultiplier;
                specialHits = specialMove.hitCount;
                specialGuaranteedCrit = specialMove.guaranteedCrit;
                specialStunChance = specialMove.stunChance;
                // Apply special effects
                if (specialMove.defPenetration > 0) {
                    def = Math.floor(def * (1 - specialMove.defPenetration));
                    specialImpact = `DEF貫通×${specialMove.damageMultiplier}`;
                }
                else if (specialMove.healRatio > 0) {
                    const maxHp = isP1Attacker ? maxHp1 : maxHp2;
                    specialHealAmount = Math.floor(maxHp * specialMove.healRatio);
                    specialImpact = `回復${Math.floor(specialMove.healRatio * 100)}%`;
                }
                else if (specialMove.hitCount > 1) {
                    specialImpact = `${specialMove.hitCount}連撃`;
                }
                else if (specialMove.guaranteedCrit) {
                    specialImpact = `確定クリティカル×${specialMove.damageMultiplier}`;
                }
                else if (specialMove.stunChance > 0) {
                    specialImpact = `スタン${Math.floor(specialMove.stunChance * 100)}%`;
                }
                else {
                    specialImpact = `×${specialMove.damageMultiplier}`;
                }
                reasonTags.push(`必殺技:${specialMove.name}`);
            }
        }
        const { effectiveAtk, effectiveDef } = normalizeStats(atk, def);
        const coreDamage = computeCoreDamage(effectiveAtk, effectiveDef);
        // スキル発動判定 (with Overdrive bonus)
        let skill = null;
        const overdriveActive = odResult.newState.isActive;
        const triggerBonus = (0, battleOverdrive_1.getOverdriveTriggerBonus)(overdriveActive);
        if (attackerSkills.length > 0) {
            for (const s of attackerSkills) {
                const effectiveTriggerRate = Math.min(1.0, s.triggerRate + triggerBonus);
                if (rng.next() < effectiveTriggerRate) {
                    skill = s;
                    break; // 1ターンに1つだけ発動
                }
            }
        }
        // Overdrive skill power multiplier
        const overdriveSkillMult = (0, battleOverdrive_1.getOverdriveSkillMultiplier)(overdriveActive);
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
                    const healAmount = Math.floor(getMaxHp(attacker) * skill.power * overdriveSkillMult);
                    if (attacker.id === robot1.id) {
                        hp1 = Math.min(maxHp1, hp1 + healAmount);
                        attackerHp = hp1;
                    }
                    else {
                        hp2 = Math.min(maxHp2, hp2 + healAmount);
                        attackerHp = hp2;
                    }
                    message = `${attacker.name} uses ${skill.name}! Recovered ${healAmount} HP!`;
                    damage = 0;
                    break;
                default: // defense, buff, debuff (簡易実装: ダメージボーナス)
                    const bonusDamage = Math.floor(coreDamage * 0.5);
                    damage = toDamage(bonusDamage * elementMultiplier * stanceMultiplier * overdriveSkillMult);
                    message = `${attacker.name} uses ${skill.name}! Dealt ${damage} damage!`;
                    break;
            }
        }
        else {
            // 通常攻撃 - New Damage Formula (Defense-Weighted)
            // core = floor(BASE_DAMAGE_POWER * atk / (def + DEFENSE_OFFSET))
            // variance = 0.90..1.10
            // damage = max(1, floor(core * variance))
            const variance = 0.90 + rng.next() * 0.20; // 0.90 to 1.10
            const baseDamage = Math.max(1, Math.floor(coreDamage * variance));
            // クリティカル判定 - Speed-based formula
            // critChance = clamp(0.05 + (spd - oppSpd)*0.002, 0.05, 0.25)
            let critChance = Math.max(0.05, Math.min(0.25, 0.05 + speedDiff * 0.002));
            // Legacy critical_lens item bonus
            if (attacker.id === robot1.id && robot1Items.includes('critical_lens')) {
                critChance = Math.min(0.25, critChance + 0.10);
            }
            // Add passive crit bonus
            if (weaponPassive) {
                const effect = (0, battlePassives_1.getPassiveEffect)(weaponPassive);
                if (effect.critBonus) {
                    critChance = Math.min(0.25, critChance + effect.critBonus);
                }
            }
            isCritical = rng.next() < critChance;
            // Special Move: Guaranteed critical
            if (specialGuaranteedCrit) {
                isCritical = true;
            }
            // ============================================
            // JAMMER Item: Nullify critical (post-RNG, deterministic)
            // ============================================
            if (isCritical) {
                // Defender is P1 (robot1) and has JAMMER ready
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
                }
                // Defender is P2 (robot2) and has JAMMER ready
                else if (defender.id === robot2.id && p2ItemReady === 'JAMMER' && !p2ItemUsed) {
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
            if (isCritical)
                reasonTags.push("クリティカル");
            // Apply element and stance multipliers (variance already in baseDamage)
            damage = toDamage(baseDamage * elementMultiplier * stanceMultiplier);
            if (isCritical)
                damage = toDamage(damage * CRIT_MULTIPLIER);
            // Apply special move damage multiplier
            if (specialTriggered && specialDamageMultiplier !== 1.0) {
                damage = toDamage(damage * specialDamageMultiplier);
            }
            // Handle multi-hit specials (RAPID_COMBO)
            if (specialTriggered && specialHits > 1) {
                // Damage is already the total, but we'll log the hit count
                // Each hit is damage / hitCount, total = damage
            }
            message = specialTriggered
                ? `🔥 ${attacker.name} ${specialName}！ ${damage}ダメージ！`
                : `${attacker.name} attacks ${defender.name} for ${damage} damage!`;
        }
        // ============================================
        // Guard stance: additional reduction when defender guards
        // ============================================
        let guardApplied = false;
        if (damage > 0 && defenderStance === "GUARD") {
            damage = toDamage(damage * GUARD_MULTIPLIER);
            guardApplied = true;
            reasonTags.push("ガードで軽減");
        }
        // ============================================
        // BattleEngine v2: DEFENDER PASSIVES (Accessory - damage reduction)
        // ============================================
        if (damage > 0 && !passiveTriggered) {
            const accessoryPassive = (0, battlePassives_1.checkPassive)(rng, defender, "accessory");
            if (accessoryPassive) {
                passiveTriggered = accessoryPassive;
                const effect = (0, battlePassives_1.getPassiveEffect)(accessoryPassive);
                if (effect.damageReduction) {
                    damage = toDamage(damage * effect.damageReduction);
                    message += ` (${accessoryPassive.effectName} reduced damage!)`;
                }
            }
        }
        // ============================================
        // CHEER SYSTEM: Apply 1.2x multiplier (AFTER all other calculations)
        // ============================================
        let cheerApplied = false;
        let cheerSide;
        const cheerMultiplier = 1.2;
        // P1 = robot1, P2 = robot2
        if (attacker.id === robot1.id && p1CheerReady && !p1CheerUsed && damage > 0) {
            damage = toDamage(damage * cheerMultiplier);
            p1CheerReady = false;
            p1CheerUsed = true;
            cheerApplied = true;
            cheerSide = 'P1';
            message += ` 🎉声援が刃になった（×${cheerMultiplier}）`;
        }
        else if (attacker.id === robot2.id && p2CheerReady && !p2CheerUsed && damage > 0) {
            damage = toDamage(damage * cheerMultiplier);
            p2CheerReady = false;
            p2CheerUsed = true;
            cheerApplied = true;
            cheerSide = 'P2';
            message += ` 🎉声援が刃になった（×${cheerMultiplier}）`;
        }
        // ============================================
        // PRE-BATTLE ITEM SYSTEM: Apply items (AFTER cheer)
        // ============================================
        // ============================================
        // PRE-BATTLE ITEM SYSTEM: Apply items (AFTER cheer)
        // ============================================
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
            }
            else if (attacker.id === robot2.id && p2ItemReady === 'BOOST' && !p2ItemUsed) {
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
            }
            else if (defender.id === robot2.id && p2ItemReady === 'SHIELD' && !p2ItemUsed) {
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
        // HP減少（回復以外）
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
                // Update defender overdrive (took damage)
                const defOverdrive = getOverdrive(defender.id);
                const stanceLost = stanceOutcome === "WIN"; // Defender lost stance
                setOverdrive(defender.id, (0, battleOverdrive_1.addOverdrive)(defOverdrive, damage, maxHp2, stanceLost));
            }
            else {
                hp1 -= damage;
                defenderHp = hp1;
                totalDamageP2 += damage; // Track P2's damage
                // Update defender overdrive (took damage)
                const defOverdrive = getOverdrive(defender.id);
                const stanceLost = stanceOutcome === "WIN";
                setOverdrive(defender.id, (0, battleOverdrive_1.addOverdrive)(defOverdrive, damage, maxHp1, stanceLost));
            }
            // ============================================
            // Speed-based pursuit (追撃)
            // ============================================
            if (speedDiff >= PURSUIT_SPEED_THRESHOLD) {
                pursuitDamage = toDamage(damage * PURSUIT_DAMAGE_RATIO);
                followUpDamage += pursuitDamage;
                if (attacker.id === robot1.id) {
                    hp2 -= pursuitDamage;
                    defenderHp = hp2;
                    totalDamageP1 += pursuitDamage;
                }
                else {
                    hp1 -= pursuitDamage;
                    defenderHp = hp1;
                    totalDamageP2 += pursuitDamage;
                }
                reasonTags.push("速度差で追撃");
                message += ` 追撃で${pursuitDamage}ダメージ！`;
            }
            // ============================================
            // BattleEngine v2: POST-ATTACK PASSIVES (Backpack - follow-up, lifesteal)
            // ============================================
            if (!passiveTriggered) {
                const backpackPassive = (0, battlePassives_1.checkPassive)(rng, attacker, "backpack");
                if (backpackPassive) {
                    passiveTriggered = backpackPassive;
                    const effect = (0, battlePassives_1.getPassiveEffect)(backpackPassive);
                    // Follow-up damage
                    if (effect.followUpDamage) {
                        const passiveFollowUpDamage = toDamage(effectiveAtk * effect.followUpDamage);
                        followUpDamage += passiveFollowUpDamage;
                        if (attacker.id === robot1.id) {
                            hp2 -= passiveFollowUpDamage;
                            defenderHp = hp2;
                            totalDamageP1 += passiveFollowUpDamage; // Track P1's followup damage
                        }
                        else {
                            hp1 -= passiveFollowUpDamage;
                            defenderHp = hp1;
                            totalDamageP2 += passiveFollowUpDamage; // Track P2's followup damage
                        }
                        message += ` ${backpackPassive.effectName}で${passiveFollowUpDamage}追撃！`;
                    }
                    // Heal from damage
                    if (effect.healRatio) {
                        const healVal = Math.floor((damage + followUpDamage) * effect.healRatio);
                        if (attacker.id === robot1.id) {
                            hp1 = Math.min(maxHp1, hp1 + healVal);
                            attackerHp = hp1;
                        }
                        else {
                            hp2 = Math.min(maxHp2, hp2 + healVal);
                            attackerHp = hp2;
                        }
                        message += ` (Recovered ${healVal} HP!)`;
                    }
                }
            }
        }
        // ============================================
        // Special Move: Heal Effect (TANK - Iron Fortress)
        // ============================================
        if (specialTriggered && specialHealAmount > 0) {
            if (attacker.id === robot1.id) {
                hp1 = Math.min(maxHp1, hp1 + specialHealAmount);
                attackerHp = hp1;
            }
            else {
                hp2 = Math.min(maxHp2, hp2 + specialHealAmount);
                attackerHp = hp2;
            }
            message += ` HP${specialHealAmount}回復！`;
        }
        const totalHitDamage = damage + followUpDamage;
        // ============================================
        // Special Move: Stun Effect (TRICKY - Chaos Disrupt)
        // ============================================
        if (specialTriggered && specialStunChance > 0 && damage > 0 && defenderHp > 0) {
            // Use RNG for deterministic stun chance
            if (rng.next() < specialStunChance) {
                stunApplied = true;
                if (defender.id === robot1.id)
                    p1Stunned = true;
                else
                    p2Stunned = true;
                reasonTags.push("必殺スタン");
                message += ` スタン発動！`;
            }
        }
        // Speed-based stun (separate from special stun)
        if (!stunApplied && damage > 0 && defenderHp > 0 && speedDiff >= STUN_SPEED_THRESHOLD) {
            if (totalHitDamage >= getMaxHp(defender) * STUN_DAMAGE_RATIO) {
                stunApplied = true;
                if (defender.id === robot1.id)
                    p1Stunned = true;
                else
                    p2Stunned = true;
                reasonTags.push("スタン");
                message += ` スタン！次のターン行動不能`;
            }
        }
        if (damage > 0 && defenderHp > 0 && !stunApplied) {
            const defenderFaster = speedDiff <= -COUNTER_SPEED_THRESHOLD;
            const defenderTanky = def >= atk * COUNTER_DEFENSE_RATIO;
            if (defenderFaster && defenderTanky) {
                const counterAtk = getStat(defender, 'baseAttack');
                const counterDef = getStat(attacker, 'baseDefense');
                const { effectiveAtk: counterEffectiveAtk, effectiveDef: counterEffectiveDef } = normalizeStats(counterAtk, counterDef);
                const counterCoreDamage = computeCoreDamage(counterEffectiveAtk, counterEffectiveDef);
                const counterElementMultiplier = getElementMultiplier(defender, attacker);
                counterDamage = toDamage(counterCoreDamage * COUNTER_DAMAGE_RATIO * counterElementMultiplier);
                if (counterDamage > 0) {
                    counterMessage = `${defender.name}の反撃！ ${counterDamage}ダメージ！`;
                }
            }
        }
        // Add stance info to message
        const stanceInfo = stanceOutcome === "WIN"
            ? `[読み勝ち:${attackerStance}>${defenderStance}]`
            : stanceOutcome === "LOSE"
                ? `[読み負け:${attackerStance}<${defenderStance}]`
                : `[読み合い:${attackerStance}]`;
        const reasonNote = reasonTags.length ? `（${reasonTags.join("・")}）` : "";
        const messageWithReasons = reasonNote ? `${message} ${reasonNote}` : message;
        if (overdriveTriggered) {
            message = `🔥 OVERDRIVE! ` + messageWithReasons;
        }
        else {
            message = messageWithReasons;
        }
        logs.push({
            turn,
            attackerId: attacker.id,
            defenderId: defender.id,
            action,
            skillName,
            damage: damage + followUpDamage,
            isCritical,
            attackerHp: Math.max(0, attackerHp),
            defenderHp: Math.max(0, defenderHp),
            message: `${stanceInfo} ${message}`.trim(),
            // BattleEngine v2 fields
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
            // Cheer System
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
            // Special Move System
            specialTriggered: specialTriggered || undefined,
            specialName: specialName,
            specialRoleName: specialRoleName,
            specialImpact: specialImpact,
            specialHits: specialHits > 1 ? specialHits : undefined,
        });
        if (counterDamage > 0) {
            const counterAttackerHp = defenderHp;
            if (attacker.id === robot1.id) {
                hp1 -= counterDamage;
                attackerHp = hp1;
                totalDamageP2 += counterDamage;
            }
            else {
                hp2 -= counterDamage;
                attackerHp = hp2;
                totalDamageP1 += counterDamage;
            }
            const damagedOverdrive = getOverdrive(attacker.id);
            const damagedMaxHp = attacker.id === robot1.id ? maxHp1 : maxHp2;
            setOverdrive(attacker.id, (0, battleOverdrive_1.addOverdrive)(damagedOverdrive, counterDamage, damagedMaxHp, false));
            logs.push({
                turn,
                attackerId: defender.id,
                defenderId: attacker.id,
                action: 'counter',
                damage: counterDamage,
                isCritical: false,
                attackerHp: Math.max(0, counterAttackerHp),
                defenderHp: Math.max(0, attackerHp),
                message: counterMessage,
            });
        }
        if (hp1 <= 0 || hp2 <= 0)
            break;
        // 攻守交代
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
    let winnerId;
    let loserId;
    if (hp1 <= 0 || hp2 <= 0) {
        // One robot is KO'd
        winnerId = (hp1 > 0 ? robot1.id : robot2.id);
        loserId = (hp1 > 0 ? robot2.id : robot1.id);
    }
    else {
        // Turn limit reached - apply tiebreaker logic
        // 1. Higher remaining HP
        if (hp1 > hp2) {
            winnerId = robot1.id;
            loserId = robot2.id;
        }
        else if (hp2 > hp1) {
            winnerId = robot2.id;
            loserId = robot1.id;
        }
        else {
            // 2. Equal HP - check total damage dealt
            if (totalDamageP1 > totalDamageP2) {
                winnerId = robot1.id;
                loserId = robot2.id;
            }
            else if (totalDamageP2 > totalDamageP1) {
                winnerId = robot2.id;
                loserId = robot1.id;
            }
            else {
                // 3. Equal damage - check speed
                if (robot1.baseSpeed > robot2.baseSpeed) {
                    winnerId = robot1.id;
                    loserId = robot2.id;
                }
                else if (robot2.baseSpeed > robot1.baseSpeed) {
                    winnerId = robot2.id;
                    loserId = robot1.id;
                }
                else {
                    // 4. All equal - P1 wins (deterministic)
                    winnerId = robot1.id;
                    loserId = robot2.id;
                }
            }
        }
    }
    return {
        winnerId,
        loserId,
        logs,
        rewards: {
            exp: 100,
            coins: 50
        },
        totalDamageP1,
        totalDamageP2,
        turnCount: turn - 1,
    };
};
exports.simulateBattle = simulateBattle;
//# sourceMappingURL=battleSystem.js.map