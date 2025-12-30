/**
 * BattleEngine v2: Full Battle System
 * Integrates Stance, Overdrive, and Part Passives
 */

import { RobotData, Skill, BattleResult, BattleLog, OverdriveState, PassiveTrigger } from "./types";
import { getSkillById } from "./skills";
import { SeededRandom } from "./seededRandom";
import { getStanceWeights, pickStance, resolveStance, getStanceMultiplier } from "./battleStance";
import { createOverdriveState, addOverdrive, tickOverdrive, getOverdriveSkillMultiplier, getOverdriveTriggerBonus } from "./battleOverdrive";
import { checkPassive, getPassiveEffect } from "./battlePassives";

const resolveSkills = (skills: RobotData["skills"]): Skill[] => {
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

const MAX_TURNS = 20;
const toDamage = (value: number): number => Math.max(1, Math.floor(value));

const getElementMultiplier = (attacker: RobotData, defender: RobotData): number => {
  const attackerType = attacker.elementType ?? 0;
  const defenderType = defender.elementType ?? 0;
  if (!attackerType || !defenderType || attackerType === defenderType) return 1;

  // Use a simple cyclic order (1->2->...->7->1) for advantage/weakness.
  const advantage = (attackerType % 7) + 1;
  const disadvantage = ((attackerType + 5) % 7) + 1;

  if (defenderType === advantage) return 1.5;
  if (defenderType === disadvantage) return 0.75;
  return 1;
};

export interface CheerInput {
  p1: boolean;  // P1 (robot1) has cheer reserved
  p2: boolean;  // P2 (robot2) has cheer reserved
}

import { BattleItemType, BattleItemInput } from "./types";

export const simulateBattle = (
  robot1: RobotData,
  robot2: RobotData,
  battleId?: string,
  robot1Items: string[] = [],
  cheer?: CheerInput,
  battleItems?: BattleItemInput  // NEW: Pre-battle items (optional, backward compatible)
): BattleResult => {
  let hp1 = robot1.baseHp;
  let hp2 = robot2.baseHp;
  const logs: BattleLog[] = [];
  let turn = 1;
  const robot1Skills = resolveSkills(robot1.skills);
  const robot2Skills = resolveSkills(robot2.skills);
  const rng = new SeededRandom(battleId ?? `${robot1.id ?? "robot1"}-${robot2.id ?? "robot2"}`);

  // BattleEngine v2: Initialize overdrive states
  let overdrive1 = createOverdriveState();
  let overdrive2 = createOverdriveState();

  // BattleEngine v2: Pre-calculate stance weights
  const stanceWeights1 = getStanceWeights(robot1);
  const stanceWeights2 = getStanceWeights(robot2);

  // アイテム使用フラグ (legacy items)
  let usedRepairKit = false;

  // Cheer System: Initialize state
  let p1CheerReady = !!cheer?.p1;
  let p1CheerUsed = false;
  let p2CheerReady = !!cheer?.p2;
  let p2CheerUsed = false;

  // Pre-Battle Item System: Initialize state
  let p1ItemReady: BattleItemType | null = battleItems?.p1 ?? null;
  let p1ItemUsed = false;
  let p2ItemReady: BattleItemType | null = battleItems?.p2 ?? null;
  let p2ItemUsed = false;

  // Track total damage for tiebreaker
  let totalDamageP1 = 0;
  let totalDamageP2 = 0;

  // ステータス補正関数
  const getStat = (robot: RobotData, stat: 'baseAttack' | 'baseDefense') => {
    let val = robot[stat];
    if (robot.id === robot1.id) {
      if (stat === 'baseAttack' && robot1Items.includes('attack_boost')) val *= 1.2;
      if (stat === 'baseDefense' && robot1Items.includes('defense_boost')) val *= 1.2;
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
  const getOverdrive = (robotId: string | undefined) => robotId === robot1.id ? overdrive1 : overdrive2;
  const setOverdrive = (robotId: string | undefined, state: OverdriveState) => {
    if (robotId === robot1.id) overdrive1 = state;
    else overdrive2 = state;
  };

  // 最大30ターンで決着をつける
  while (hp1 > 0 && hp2 > 0 && turn <= MAX_TURNS) {
    // ============================================
    // BattleEngine v2: STANCE RESOLUTION
    // ============================================
    // Pre-Battle Item System: Initialize turn item state
    let itemApplied = false;
    let itemSide: 'P1' | 'P2' | undefined;
    let itemType: BattleItemType | undefined;
    let itemEffect: string | undefined;

    const attackerWeights = attacker.id === robot1.id ? stanceWeights1 : stanceWeights2;
    const defenderWeights = defender.id === robot1.id ? stanceWeights1 : stanceWeights2;

    const attackerStance = pickStance(rng, attackerWeights);
    const defenderStance = pickStance(rng, defenderWeights);
    const stanceOutcome = resolveStance(attackerStance, defenderStance);
    const stanceMultiplier = getStanceMultiplier(stanceOutcome, true);

    // ============================================
    // BattleEngine v2: OVERDRIVE CHECK
    // ============================================
    let overdriveTriggered = false;
    let overdriveMessage: string | undefined;

    const attackerOverdrive = getOverdrive(attacker.id);
    const odResult = tickOverdrive(attackerOverdrive);
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
        attackerId: robot1.id!,
        defenderId: robot1.id!,
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
      if (attacker.id === robot1.id) attackerHp = hp1;
      else defenderHp = hp1;
    }

    let damage = 0;
    let isCritical = false;
    let action: 'attack' | 'skill' = 'attack';
    let skillName = undefined;
    let message = "";
    let passiveTriggered: PassiveTrigger | undefined;
    const elementMultiplier = getElementMultiplier(attacker, defender);

    let atk = getStat(attacker, 'baseAttack');
    let def = getStat(defender, 'baseDefense');

    // ============================================
    // BattleEngine v2: PRE-ATTACK PASSIVES (Weapon)
    // ============================================
    const weaponPassive = checkPassive(rng, attacker, "weapon");
    if (weaponPassive) {
      passiveTriggered = weaponPassive;
      const effect = getPassiveEffect(weaponPassive);

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
    let skill: Skill | null = null;
    const overdriveActive = odResult.newState.isActive;
    const triggerBonus = getOverdriveTriggerBonus(overdriveActive);

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
    const overdriveSkillMult = getOverdriveSkillMultiplier(overdriveActive);

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
          } else {
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
    } else {
      // 通常攻撃 - New Damage Formula
      // base = floor((atk*atk)/(atk+def))
      // variance = 0.90..1.10
      // damage = max(1, floor(base * variance))
      const baseRaw = (atk * atk) / (atk + def);
      const base = Math.floor(baseRaw);
      const variance = 0.90 + rng.next() * 0.20; // 0.90 to 1.10
      const baseDamage = Math.max(1, Math.floor(base * variance));

      // クリティカル判定 - Speed-based formula
      // critChance = clamp(0.05 + (spd - oppSpd)*0.002, 0.05, 0.25)
      const speedDiff = attacker.baseSpeed - defender.baseSpeed;
      let critChance = Math.max(0.05, Math.min(0.25, 0.05 + speedDiff * 0.002));

      // Legacy critical_lens item bonus
      if (attacker.id === robot1.id && robot1Items.includes('critical_lens')) {
        critChance = Math.min(0.25, critChance + 0.10);
      }
      // Add passive crit bonus
      if (weaponPassive) {
        const effect = getPassiveEffect(weaponPassive);
        if (effect.critBonus) {
          critChance = Math.min(0.25, critChance + effect.critBonus);
        }
      }

      isCritical = rng.next() < critChance;

      // ============================================
      // CANCEL_CRIT Item: Nullify critical (post-RNG, deterministic)
      // ============================================
      if (isCritical) {
        // Defender is P1 (robot1) and has CANCEL_CRIT ready
        if (defender.id === robot1.id && p1ItemReady === 'CANCEL_CRIT' && !p1ItemUsed) {
          isCritical = false;
          p1ItemReady = null;
          p1ItemUsed = true;
          itemApplied = true;
          itemSide = 'P1';
          itemType = 'CANCEL_CRIT';
          itemEffect = 'Crit Cancelled';
          message += ` 🤞クリティカルをお守りが防いだ！`;
        }
        // Defender is P2 (robot2) and has CANCEL_CRIT ready
        else if (defender.id === robot2.id && p2ItemReady === 'CANCEL_CRIT' && !p2ItemUsed) {
          isCritical = false;
          p2ItemReady = null;
          p2ItemUsed = true;
          itemApplied = true;
          itemSide = 'P2';
          itemType = 'CANCEL_CRIT';
          itemEffect = 'Crit Cancelled';
          message += ` 🤞クリティカルをお守りが防いだ！`;
        }
      }

      // Apply element and stance multipliers (variance already in baseDamage)
      damage = toDamage(baseDamage * elementMultiplier * stanceMultiplier);
      if (isCritical) damage = toDamage(damage * 1.5);
      message = `${attacker.name} attacks ${defender.name} for ${damage} damage!`;
    }

    // ============================================
    // BattleEngine v2: DEFENDER PASSIVES (Accessory - damage reduction)
    // ============================================
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

    // ============================================
    // CHEER SYSTEM: Apply 1.2x multiplier (AFTER all other calculations)
    // ============================================
    let cheerApplied = false;
    let cheerSide: 'P1' | 'P2' | undefined;
    const cheerMultiplier = 1.2;

    // P1 = robot1, P2 = robot2
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
        message += ` ⚡ブーストアイテム発動！（${itemEffect}）`;
      } else if (attacker.id === robot2.id && p2ItemReady === 'BOOST' && !p2ItemUsed) {
        damage = toDamage(damage * BOOST_MULTIPLIER);
        p2ItemReady = null;
        p2ItemUsed = true;
        itemApplied = true;
        itemSide = 'P2';
        itemType = 'BOOST';
        itemEffect = `×${BOOST_MULTIPLIER}`;
        message += ` ⚡ブーストアイテム発動！（${itemEffect}）`;
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
        message += ` 🛡️シールドアイテム発動！（${itemEffect}）`;
      } else if (defender.id === robot2.id && p2ItemReady === 'SHIELD' && !p2ItemUsed) {
        damage = toDamage(damage * SHIELD_MULTIPLIER);
        p2ItemReady = null;
        p2ItemUsed = true;
        itemApplied = true;
        itemSide = 'P2';
        itemType = 'SHIELD';
        itemEffect = `×${SHIELD_MULTIPLIER}`;
        message += ` 🛡️シールドアイテム発動！（${itemEffect}）`;
      }
    }

    // CANCEL_CRIT already applied above (during normal attack critical check)
    // Log if it was used
    if (!itemApplied) {
      if (attacker.id === robot2.id && p1ItemUsed && itemType === undefined) {
        // Check if P1's CANCEL_CRIT was used this turn (defender blocked crit)
      }
      if (attacker.id === robot1.id && p2ItemUsed && itemType === undefined) {
        // Check if P2's CANCEL_CRIT was used this turn
      }
    }

    // HP減少（回復以外）
    let followUpDamage = 0;
    if (damage > 0) {
      if (attacker.id === robot1.id) {
        hp2 -= damage;
        defenderHp = hp2;
        totalDamageP1 += damage; // Track P1's damage

        // Update defender overdrive (took damage)
        const defOverdrive = getOverdrive(defender.id);
        const stanceLost = stanceOutcome === "WIN"; // Defender lost stance
        setOverdrive(defender.id, addOverdrive(defOverdrive, damage, robot2.baseHp, stanceLost));
      } else {
        hp1 -= damage;
        defenderHp = hp1;
        totalDamageP2 += damage; // Track P2's damage

        // Update defender overdrive (took damage)
        const defOverdrive = getOverdrive(defender.id);
        const stanceLost = stanceOutcome === "WIN";
        setOverdrive(defender.id, addOverdrive(defOverdrive, damage, robot1.baseHp, stanceLost));
      }

      // ============================================
      // BattleEngine v2: POST-ATTACK PASSIVES (Backpack - follow-up, lifesteal)
      // ============================================
      if (!passiveTriggered) {
        const backpackPassive = checkPassive(rng, attacker, "backpack");
        if (backpackPassive) {
          passiveTriggered = backpackPassive;
          const effect = getPassiveEffect(backpackPassive);

          // Follow-up damage
          if (effect.followUpDamage) {
            followUpDamage = toDamage(atk * effect.followUpDamage);
            if (attacker.id === robot1.id) {
              hp2 -= followUpDamage;
              defenderHp = hp2;
              totalDamageP1 += followUpDamage; // Track P1's followup damage
            } else {
              hp1 -= followUpDamage;
              defenderHp = hp1;
              totalDamageP2 += followUpDamage; // Track P2's followup damage
            }
            message += ` ${backpackPassive.effectName} deals ${followUpDamage} extra!`;
          }

          // Heal from damage
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

    // Add stance info to message
    const stanceInfo = stanceOutcome === "WIN" ? `[Stance WIN: ${attackerStance}>${defenderStance}]`
      : stanceOutcome === "LOSE" ? `[Stance LOSE: ${attackerStance}<${defenderStance}]`
        : `[Stance DRAW: ${attackerStance}]`;

    if (overdriveTriggered) {
      message = `🔥 OVERDRIVE! ` + message;
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
      // Pre-Battle Item System
      itemApplied: itemApplied || undefined,
      itemSide: itemSide,
      itemType: itemType,
      itemEffect: itemEffect,
    });

    if (hp1 <= 0 || hp2 <= 0) break;

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
      exp: 100,
      coins: 50
    },
    totalDamageP1,
    totalDamageP2,
    turnCount: turn - 1,
  };
};
