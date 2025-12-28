import { RobotData, Skill } from "./types";

interface BattleLog {
  turn: number;
  attackerId: string;
  defenderId: string;
  action: 'attack' | 'skill';
  skillName?: string;
  damage: number;
  isCritical: boolean;
  attackerHp: number;
  defenderHp: number;
  message: string;
}

interface BattleResult {
  winnerId: string;
  loserId: string;
  logs: BattleLog[];
  rewards: {
    exp: number;
    coins: number;
  };
}

export const simulateBattle = (robot1: RobotData, robot2: RobotData): BattleResult => {
  let hp1 = robot1.baseHp;
  let hp2 = robot2.baseHp;
  const logs: BattleLog[] = [];
  let turn = 1;

  // 素早さで先攻後攻を決定
  let attacker = robot1.baseSpeed >= robot2.baseSpeed ? robot1 : robot2;
  let defender = robot1.baseSpeed >= robot2.baseSpeed ? robot2 : robot1;
  let attackerHp = robot1.baseSpeed >= robot2.baseSpeed ? hp1 : hp2;
  let defenderHp = robot1.baseSpeed >= robot2.baseSpeed ? hp2 : hp1;

  // 最大20ターンで決着をつける
  while (hp1 > 0 && hp2 > 0 && turn <= 20) {
    let damage = 0;
    let isCritical = false;
    let action: 'attack' | 'skill' = 'attack';
    let skillName = undefined;
    let message = "";

    // スキル発動判定
    let skill: Skill | null = null;
    if (attacker.skills && attacker.skills.length > 0) {
      for (const s of attacker.skills) {
        if (Math.random() < s.triggerRate) {
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
          const baseDamage = Math.max(1, attacker.baseAttack - (defender.baseDefense / 2));
          damage = Math.floor(baseDamage * skill.power);
          message = `${attacker.name} uses ${skill.name}! Dealt ${damage} damage!`;
          break;
        case 'heal':
          const healAmount = Math.floor(attacker.baseHp * skill.power);
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
          const bonusDamage = Math.floor(attacker.baseAttack * 0.5);
          damage = bonusDamage;
          message = `${attacker.name} uses ${skill.name}! Dealt ${damage} damage!`;
          break;
      }
    } else {
      // 通常攻撃
      const baseDamage = Math.max(1, attacker.baseAttack - (defender.baseDefense / 2));
      const multiplier = 0.8 + Math.random() * 0.4;
      isCritical = Math.random() < 0.1;
      
      damage = Math.floor(baseDamage * multiplier);
      if (isCritical) damage = Math.floor(damage * 1.5);
      message = `${attacker.name} attacks ${defender.name} for ${damage} damage!`;
    }

    // HP減少（回復以外）
    if (damage > 0) {
      if (attacker.id === robot1.id) {
        hp2 -= damage;
        defenderHp = hp2;
      } else {
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

    if (hp1 <= 0 || hp2 <= 0) break;

    // 攻守交代
    const tempRobot = attacker;
    attacker = defender;
    defender = tempRobot;
    turn++;
  }

  const winnerId = hp1 > 0 ? robot1.id : robot2.id;
  const loserId = hp1 > 0 ? robot2.id : robot1.id;

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
