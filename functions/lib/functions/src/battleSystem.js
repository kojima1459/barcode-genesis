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
const MAX_TURNS = 30;
const toDamage = (value) => Math.max(1, Math.floor(value));
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
const simulateBattle = (robot1, robot2, battleId, robot1Items = [], cheer) => {
    var _a, _b;
    let hp1 = robot1.baseHp;
    let hp2 = robot2.baseHp;
    const logs = [];
    let turn = 1;
    const robot1Skills = resolveSkills(robot1.skills);
    const robot2Skills = resolveSkills(robot2.skills);
    const rng = new seededRandom_1.SeededRandom(battleId !== null && battleId !== void 0 ? battleId : `${(_a = robot1.id) !== null && _a !== void 0 ? _a : "robot1"}-${(_b = robot2.id) !== null && _b !== void 0 ? _b : "robot2"}`);
    // BattleEngine v2: Initialize overdrive states
    let overdrive1 = (0, battleOverdrive_1.createOverdriveState)();
    let overdrive2 = (0, battleOverdrive_1.createOverdriveState)();
    // BattleEngine v2: Pre-calculate stance weights
    const stanceWeights1 = (0, battleStance_1.getStanceWeights)(robot1);
    const stanceWeights2 = (0, battleStance_1.getStanceWeights)(robot2);
    // アイテム使用フラグ
    let usedRepairKit = false;
    // Cheer System: Initialize state
    let p1CheerReady = !!(cheer === null || cheer === void 0 ? void 0 : cheer.p1);
    let p1CheerUsed = false;
    let p2CheerReady = !!(cheer === null || cheer === void 0 ? void 0 : cheer.p2);
    let p2CheerUsed = false;
    // ステータス補正関数
    const getStat = (robot, stat) => {
        let val = robot[stat];
        if (robot.id === robot1.id) {
            if (stat === 'baseAttack' && robot1Items.includes('attack_boost'))
                val *= 1.2;
            if (stat === 'baseDefense' && robot1Items.includes('defense_boost'))
                val *= 1.2;
        }
        return Math.floor(val);
    };
    // 素早さで先攻後攻を決定
    let attacker = robot1.baseSpeed >= robot2.baseSpeed ? robot1 : robot2;
    let defender = robot1.baseSpeed >= robot2.baseSpeed ? robot2 : robot1;
    let attackerHp = robot1.baseSpeed >= robot2.baseSpeed ? hp1 : hp2;
    let defenderHp = robot1.baseSpeed >= robot2.baseSpeed ? hp2 : hp1;
    let attackerSkills = robot1.baseSpeed >= robot2.baseSpeed ? robot1Skills : robot2Skills;
    let defenderSkills = robot1.baseSpeed >= robot2.baseSpeed ? robot2Skills : robot1Skills;
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
        if (robot1Items.includes('repair_kit') && !usedRepairKit && hp1 < robot1.baseHp * 0.5) {
            const healAmount = Math.floor(robot1.baseHp * 0.3);
            hp1 = Math.min(robot1.baseHp, hp1 + healAmount);
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
                    const baseDamage = Math.max(1, atk - (def / 2));
                    damage = toDamage(baseDamage * skill.power * elementMultiplier * stanceMultiplier * overdriveSkillMult);
                    message = `${attacker.name} uses ${skill.name}! Dealt ${damage} damage!`;
                    break;
                case 'heal':
                    const healAmount = Math.floor(attacker.baseHp * skill.power * overdriveSkillMult);
                    if (attacker.id === robot1.id) {
                        hp1 = Math.min(robot1.baseHp, hp1 + healAmount);
                        attackerHp = hp1;
                    }
                    else {
                        hp2 = Math.min(robot2.baseHp, hp2 + healAmount);
                        attackerHp = hp2;
                    }
                    message = `${attacker.name} uses ${skill.name}! Recovered ${healAmount} HP!`;
                    damage = 0;
                    break;
                default: // defense, buff, debuff (簡易実装: ダメージボーナス)
                    const bonusDamage = Math.floor(atk * 0.5);
                    damage = toDamage(bonusDamage * elementMultiplier * stanceMultiplier * overdriveSkillMult);
                    message = `${attacker.name} uses ${skill.name}! Dealt ${damage} damage!`;
                    break;
            }
        }
        else {
            // 通常攻撃
            const baseDamage = Math.max(1, atk - (def / 2));
            const multiplier = 0.8 + rng.next() * 0.4;
            // クリティカル判定 (with passive bonus)
            let critChance = 0.1;
            if (attacker.id === robot1.id && robot1Items.includes('critical_lens')) {
                critChance = 0.2;
            }
            // Add passive crit bonus
            if (weaponPassive) {
                const effect = (0, battlePassives_1.getPassiveEffect)(weaponPassive);
                if (effect.critBonus)
                    critChance += effect.critBonus;
            }
            isCritical = rng.next() < critChance;
            damage = toDamage(baseDamage * multiplier * elementMultiplier * stanceMultiplier);
            if (isCritical)
                damage = toDamage(damage * 1.5);
            message = `${attacker.name} attacks ${defender.name} for ${damage} damage!`;
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
        // HP減少（回復以外）
        let followUpDamage = 0;
        if (damage > 0) {
            if (attacker.id === robot1.id) {
                hp2 -= damage;
                defenderHp = hp2;
                // Update defender overdrive (took damage)
                const defOverdrive = getOverdrive(defender.id);
                const stanceLost = stanceOutcome === "WIN"; // Defender lost stance
                setOverdrive(defender.id, (0, battleOverdrive_1.addOverdrive)(defOverdrive, damage, robot2.baseHp, stanceLost));
            }
            else {
                hp1 -= damage;
                defenderHp = hp1;
                // Update defender overdrive (took damage)
                const defOverdrive = getOverdrive(defender.id);
                const stanceLost = stanceOutcome === "WIN";
                setOverdrive(defender.id, (0, battleOverdrive_1.addOverdrive)(defOverdrive, damage, robot1.baseHp, stanceLost));
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
                        followUpDamage = toDamage(atk * effect.followUpDamage);
                        if (attacker.id === robot1.id) {
                            hp2 -= followUpDamage;
                            defenderHp = hp2;
                        }
                        else {
                            hp1 -= followUpDamage;
                            defenderHp = hp1;
                        }
                        message += ` ${backpackPassive.effectName} deals ${followUpDamage} extra!`;
                    }
                    // Heal from damage
                    if (effect.healRatio) {
                        const healVal = Math.floor((damage + followUpDamage) * effect.healRatio);
                        if (attacker.id === robot1.id) {
                            hp1 = Math.min(robot1.baseHp, hp1 + healVal);
                            attackerHp = hp1;
                        }
                        else {
                            hp2 = Math.min(robot2.baseHp, hp2 + healVal);
                            attackerHp = hp2;
                        }
                        message += ` (Recovered ${healVal} HP!)`;
                    }
                }
            }
        }
        // Add stance info to message
        const stanceInfo = stanceOutcome === "WIN" ? `[Stance WIN: ${attackerStance}>${defenderStance}]`
            : stanceOutcome === "LOSE" ? `[Stance LOSE: ${attackerStance}<${defenderStance}]`
                : `[Stance DRAW: ${attackerStance}]`;
        if (overdriveTriggered) {
            message = `🔥 OVERDRIVE! ` + message;
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
            message: `${stanceInfo} ${message}`,
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
            // Cheer System
            cheerApplied: cheerApplied || undefined,
            cheerSide: cheerSide,
            cheerMultiplier: cheerApplied ? cheerMultiplier : undefined,
        });
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
        winnerId = (hp1 > 0 ? robot1.id : robot2.id);
        loserId = (hp1 > 0 ? robot2.id : robot1.id);
    }
    else {
        const ratio1 = hp1 / robot1.baseHp;
        const ratio2 = hp2 / robot2.baseHp;
        if (ratio1 === ratio2) {
            if (hp1 === hp2) {
                winnerId = robot1.id;
                loserId = robot2.id;
            }
            else {
                winnerId = (hp1 > hp2 ? robot1.id : robot2.id);
                loserId = (hp1 > hp2 ? robot2.id : robot1.id);
            }
        }
        else {
            winnerId = (ratio1 > ratio2 ? robot1.id : robot2.id);
            loserId = (ratio1 > ratio2 ? robot2.id : robot1.id);
        }
    }
    return {
        winnerId,
        loserId,
        logs,
        rewards: {
            exp: 100,
            coins: 50
        }
    };
};
exports.simulateBattle = simulateBattle;
//# sourceMappingURL=battleSystem.js.map