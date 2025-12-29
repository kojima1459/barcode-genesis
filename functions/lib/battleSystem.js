"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateBattle = void 0;
const skills_1 = require("./skills");
const seededRandom_1 = require("./seededRandom");
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
const simulateBattle = (robot1, robot2, battleId, robot1Items = []) => {
    var _a, _b;
    let hp1 = robot1.baseHp;
    let hp2 = robot2.baseHp;
    const logs = [];
    let turn = 1;
    const robot1Skills = resolveSkills(robot1.skills);
    const robot2Skills = resolveSkills(robot2.skills);
    const rng = new seededRandom_1.SeededRandom(battleId !== null && battleId !== void 0 ? battleId : `${(_a = robot1.id) !== null && _a !== void 0 ? _a : "robot1"}-${(_b = robot2.id) !== null && _b !== void 0 ? _b : "robot2"}`);
    // アイテム使用フラグ
    let usedRepairKit = false;
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
    // 素早さで先攻後攻を決定（スピードチップ等の永続強化は既にrobot1に反映されている前提）
    let attacker = robot1.baseSpeed >= robot2.baseSpeed ? robot1 : robot2;
    let defender = robot1.baseSpeed >= robot2.baseSpeed ? robot2 : robot1;
    let attackerHp = robot1.baseSpeed >= robot2.baseSpeed ? hp1 : hp2;
    let defenderHp = robot1.baseSpeed >= robot2.baseSpeed ? hp2 : hp1;
    let attackerSkills = robot1.baseSpeed >= robot2.baseSpeed ? robot1Skills : robot2Skills;
    let defenderSkills = robot1.baseSpeed >= robot2.baseSpeed ? robot2Skills : robot1Skills;
    // 最大30ターンで決着をつける
    while (hp1 > 0 && hp2 > 0 && turn <= MAX_TURNS) {
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
                message: `${robot1.name} uses Repair Kit! Recovered ${healAmount} HP!`
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
        const elementMultiplier = getElementMultiplier(attacker, defender);
        const atk = getStat(attacker, 'baseAttack');
        const def = getStat(defender, 'baseDefense');
        // スキル発動判定
        let skill = null;
        if (attackerSkills.length > 0) {
            for (const s of attackerSkills) {
                if (rng.next() < s.triggerRate) {
                    skill = s;
                    break; // 1ターンに1つだけ発動
                }
            }
        }
        if (skill) {
            action = 'skill';
            skillName = skill.name;
            switch (skill.type) {
                case 'attack':
                    const baseDamage = Math.max(1, atk - (def / 2));
                    damage = toDamage(baseDamage * skill.power * elementMultiplier);
                    message = `${attacker.name} uses ${skill.name}! Dealt ${damage} damage!`;
                    break;
                case 'heal':
                    const healAmount = Math.floor(attacker.baseHp * skill.power);
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
                    damage = toDamage(bonusDamage * elementMultiplier);
                    message = `${attacker.name} uses ${skill.name}! Dealt ${damage} damage!`;
                    break;
            }
        }
        else {
            // 通常攻撃
            const baseDamage = Math.max(1, atk - (def / 2));
            const multiplier = 0.8 + rng.next() * 0.4;
            // クリティカル判定
            let critChance = 0.1;
            if (attacker.id === robot1.id && robot1Items.includes('critical_lens')) {
                critChance = 0.2;
            }
            isCritical = rng.next() < critChance;
            damage = toDamage(baseDamage * multiplier * elementMultiplier);
            if (isCritical)
                damage = toDamage(damage * 1.5);
            message = `${attacker.name} attacks ${defender.name} for ${damage} damage!`;
        }
        // HP減少（回復以外）
        if (damage > 0) {
            if (attacker.id === robot1.id) {
                hp2 -= damage;
                defenderHp = hp2;
            }
            else {
                hp1 -= damage;
                defenderHp = hp1;
            }
        }
        logs.push({
            turn,
            attackerId: attacker.id,
            defenderId: defender.id,
            action,
            skillName,
            damage,
            isCritical,
            attackerHp: Math.max(0, attackerHp),
            defenderHp: Math.max(0, defenderHp),
            message
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