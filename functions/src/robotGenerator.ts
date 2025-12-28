import { RobotData, RobotParts, RobotColors } from './types';
import * as admin from 'firebase-admin';

// 定数定義
const RARITY_NAMES = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];
const ELEMENT_NAMES = ["Fire", "Water", "Wind", "Earth", "Light", "Dark", "Machine"];

// バーコードを数値配列に分解
function parseBarcode(barcode: string): number[] {
  // 数字以外を除去し、足りない場合は0で埋める、長い場合は切り詰める
  const cleanBarcode = barcode.replace(/[^0-9]/g, '');
  const paddedBarcode = cleanBarcode.padEnd(13, '0').slice(0, 13);
  return paddedBarcode.split('').map(Number);
}

// レアリティ決定 (1-5)
function calculateRarity(digits: number[]): number {
  // M1(2), M3(4), M5(6) の和の下一桁 * 10 + P2(8), P4(10) の和の下一桁
  // digitsは0-indexedなので、M1=digits[2], M3=digits[4]...
  const score = ((digits[2] + digits[4] + digits[6]) % 10) * 10 + ((digits[7] + digits[9]) % 10);
  
  if (score >= 99) return 5; // Legendary (1%)
  if (score >= 95) return 4; // Epic (4%)
  if (score >= 85) return 3; // Rare (10%)
  if (score >= 60) return 2; // Uncommon (25%)
  return 1;                  // Common (60%)
}

// ステータス計算
function calculateStats(digits: number[], rarity: number) {
  const totalPoints = 100 + (rarity * 25);
  
  // 配分比率を決定 (P1, P2, P3, P4)
  const p1 = digits[6] + 1;
  const p2 = digits[7] + 1;
  const p3 = digits[8] + 1;
  const p4 = digits[9] + 1;
  const sum = p1 + p2 + p3 + p4;
  
  const hp = Math.floor((p1 / sum) * totalPoints);
  const attack = Math.floor((p2 / sum) * totalPoints);
  const defense = Math.floor((p3 / sum) * totalPoints);
  // 残りをSpeedに
  const speed = totalPoints - (hp + attack + defense);
  
  return {
    baseHp: hp * 10, // HPは10倍スケール
    baseAttack: attack,
    baseDefense: defense,
    baseSpeed: speed
  };
}

// 属性決定 (1-7)
function calculateElement(digits: number[]): { id: number, name: string } {
  // (M1 % 7) + 1
  const elementId = (digits[2] % 7) + 1;
  return {
    id: elementId,
    name: ELEMENT_NAMES[elementId - 1]
  };
}

// パーツ選択
function selectParts(digits: number[]): RobotParts {
  return {
    head: (digits[0] % 10) + 1,
    face: (digits[1] % 10) + 1,
    body: (digits[2] % 10) + 1,
    armLeft: (digits[3] % 10) + 1,
    armRight: (digits[4] % 10) + 1,
    legLeft: (digits[5] % 10) + 1,
    legRight: (digits[6] % 10) + 1,
    backpack: (digits[7] % 10) + 1,
    weapon: (digits[8] % 10) + 1,
    accessory: (digits[9] % 10) + 1
  };
}

// カラー生成 (HSL -> HEX)
function generateColors(digits: number[]): RobotColors {
  // ベース色相 (0-360)
  const baseHue = ((digits[10] * 10 + digits[11]) * 3.6) % 360;
  
  // HSL to HEX helper
  const hslToHex = (h: number, s: number, l: number): string => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };
  
  return {
    primary: hslToHex(baseHue, 70, 50),
    secondary: hslToHex((baseHue + 180) % 360, 60, 40), // 補色
    accent: hslToHex((baseHue + 60) % 360, 80, 60),     // 類似色
    glow: hslToHex(baseHue, 100, 70)                    // 発光色
  };
}

// スキル選択
function selectSkills(digits: number[], rarity: number): number[] {
  const skillCount = Math.min(rarity, 4); // レアリティ数だけスキルを持つ（最大4）
  const skills: number[] = [];
  
  // P5, D をシードとして使用
  let seed = digits[10] * 10 + digits[12];
  
  for (let i = 0; i < skillCount; i++) {
    // 簡易的な乱数生成
    seed = (seed * 9301 + 49297) % 233280;
    const skillId = (seed % 10) + 1; // 1-10のスキルID
    if (!skills.includes(skillId)) {
      skills.push(skillId);
    } else {
      i--; // 重複したら再抽選
    }
  }
  
  return skills.sort((a, b) => a - b);
}

// メイン生成関数
export function generateRobotData(barcode: string, userId: string): RobotData {
  const digits = parseBarcode(barcode);
  
  const rarity = calculateRarity(digits);
  const stats = calculateStats(digits, rarity);
  const element = calculateElement(digits);
  const parts = selectParts(digits);
  const colors = generateColors(digits);
  const skills = selectSkills(digits, rarity);
  
  // 名前生成 (簡易版: 属性 + レアリティ + IDの一部)
  const name = `${element.name} ${RARITY_NAMES[rarity-1]} Unit-${barcode.slice(-4)}`;
  
  return {
    userId,
    name,
    sourceBarcode: barcode,
    
    rarity,
    rarityName: RARITY_NAMES[rarity-1],
    ...stats,
    elementType: element.id,
    elementName: element.name,
    
    level: 1,
    experience: 0,
    experienceToNext: 100,
    
    parts,
    colors,
    skills,
    
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    
    totalBattles: 0,
    totalWins: 0,
    isFavorite: false
  };
}
