import { RobotData } from "./types";

interface BattleLog {
  turn: number;
  attackerId: string;
  defenderId: string;
  action: 'attack' | 'skill';
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
    // ダメージ計算 (簡易版: 攻撃力 - 防御力/2)
    const baseDamage = Math.max(1, attacker.baseAttack - (defender.baseDefense / 2));
    // ランダム要素 (0.8 ~ 1.2倍)
    const multiplier = 0.8 + Math.random() * 0.4;
    // クリティカル判定 (10%)
    const isCritical = Math.random() < 0.1;
    
    let damage = Math.floor(baseDamage * multiplier);
    if (isCritical) damage = Math.floor(damage * 1.5);

    // HP減少
    if (attacker.id === robot1.id) {
      hp2 -= damage;
      defenderHp = hp2;
      attackerHp = hp1;
    } else {
      hp1 -= damage;
      defenderHp = hp1;
      attackerHp = hp2;
    }

    logs.push({
      turn,
      attackerId: attacker.id,
      defenderId: defender.id,
      action: 'attack',
      damage,
      isCritical,
      attackerHp: Math.max(0, attackerHp),
      defenderHp: Math.max(0, defenderHp),
      message: `${attacker.name} attacks ${defender.name} for ${damage} damage!`
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
