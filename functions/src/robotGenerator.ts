import { RobotData, RobotParts, RobotColors, RobotRole } from './types';

// 定数定義
const RARITY_NAMES = ["ノーマル", "レア", "スーパーレア", "ウルトラレア", "レジェンド"];
const ELEMENT_NAMES = ["ファイア", "アクア", "ウィンド", "アース", "ライト", "ダーク", "メカ"];
const FAMILY_NAMES = ["DRINK", "SNACK", "DAILY", "BEAUTY", "OTHER"];

// ロール定義（アーキタイプ）
const ROLE_NAMES: Record<RobotRole, string> = {
  'ATTACKER': 'アサルト', // Was アタッカー
  'TANK': 'タンク',
  'SPEED': 'ランナー',   // Was スピード
  'BALANCE': 'サポート', // Was バランス
  'TRICKY': 'ジャガーノート' // Was トリッキー
};

const ROLE_TITLES: Record<RobotRole, string> = {
  'ATTACKER': '突撃',
  'TANK': '重装',
  'SPEED': '疾風',
  'BALANCE': '支援',
  'TRICKY': '破壊'
};

// 二つ名リスト (Epithet Prefixes)
const EPITHET_PREFIXES: Record<RobotRole, string[]> = {
  'ATTACKER': ["紅蓮の", "深紅の", "激昴の", "無双の", "破壊の"],
  'TANK': ["不沈の", "鉄壁の", "金剛の", "守護の", "不動の"],
  'SPEED': ["瞬足の", "翠緑の", "疾風の", "閃光の", "音速の"],
  'BALANCE': ["蒼穹の", "静寂の", "調和の", "零度の", "天空の"],
  'TRICKY': ["紫電の", "幻影の", "混沌の", "深淵の", "狂気の"]
};

// 名前パーツ（小中学生向けのかっこいい名前）
const NAME_PREFIXES = [
  "ゴースト", "サンダー", "ブレイズ", "シャドウ", "ストーム",
  "フレア", "アイス", "ダーク", "ライト", "メタル",
  "ドラゴン", "ファントム", "サイバー", "ネオ", "アルファ",
  "オメガ", "ゼロ", "プライム", "マックス", "ギガ"
];
const NAME_SUFFIXES = [
  "ナイト", "マスター", "キング", "エース", "ウォリアー",
  "ハンター", "ブレイカー", "バスター", "ライダー", "ファイター",
  "セイバー", "ガーディアン", "ストライカー", "シューター", "ドライバー",
  "ブレイド", "ウイング", "スター", "クロス", "ビート"
];

// バーコード特徴に基づく名前キーワード
const NAME_KEYWORDS: Record<string, string[]> = {
  'tank': ['装甲', '要塞', '鋼', '堅牢'],      // 0,8が多い
  'speed': ['疾風', '影', '閃光', '迅雷'],     // 1,7が多い
  'power': ['猛火', '轟', '烈', '豪'],         // 3,9が多い
  'mystic': ['深淵', '冥', '幻', '魔'],        // 2,6が多い
  'balance': ['均衡', '心', '和', '光輝'],     // 4,5が多い
};

// ============================================
// Barcode Features Extraction
// ============================================
interface BarcodeFeatures {
  digitCounts: number[];    // Count of each digit 0-9
  sumDigits: number;        // Sum of all digits
  oddCount: number;         // Count of odd digits
  evenCount: number;        // Count of even digits
  has7: boolean;            // Contains digit 7
  has0: boolean;            // Contains digit 0
  maxRunLength: number;     // Longest same-digit streak
  dominantDigit: number;    // Most frequent digit
  dominantPair: string;     // e.g., 'tank', 'speed', 'power', 'mystic', 'balance'
  last2: number;            // Last 2 digits as number
}

function extractBarcodeFeatures(digits: number[]): BarcodeFeatures {
  // Count each digit
  const digitCounts = Array(10).fill(0);
  for (const d of digits) digitCounts[d]++;

  // Sum and odd/even counts
  const sumDigits = digits.reduce((a, b) => a + b, 0);
  const oddCount = digits.filter(d => d % 2 === 1).length;
  const evenCount = digits.length - oddCount;

  // Special digit checks
  const has7 = digits.includes(7);
  const has0 = digits.includes(0);

  // Max run length (same digit streak)
  let maxRunLength = 1;
  let currentRun = 1;
  for (let i = 1; i < digits.length; i++) {
    if (digits[i] === digits[i - 1]) {
      currentRun++;
      maxRunLength = Math.max(maxRunLength, currentRun);
    } else {
      currentRun = 1;
    }
  }

  // Dominant digit (most frequent)
  let dominantDigit = 0;
  let maxCount = 0;
  for (let i = 0; i < 10; i++) {
    if (digitCounts[i] > maxCount) {
      maxCount = digitCounts[i];
      dominantDigit = i;
    }
  }

  // Determine dominant pair category
  const tankScore = digitCounts[0] + digitCounts[8];
  const speedScore = digitCounts[1] + digitCounts[7];
  const powerScore = digitCounts[3] + digitCounts[9];
  const mysticScore = digitCounts[2] + digitCounts[6];
  const balanceScore = digitCounts[4] + digitCounts[5];

  const scores = [
    { key: 'tank', score: tankScore },
    { key: 'speed', score: speedScore },
    { key: 'power', score: powerScore },
    { key: 'mystic', score: mysticScore },
    { key: 'balance', score: balanceScore },
  ];
  scores.sort((a, b) => b.score - a.score);
  const dominantPair = scores[0].score >= 3 ? scores[0].key : 'balance';

  // Last 2 digits
  const last2 = digits[11] * 10 + digits[12];

  return {
    digitCounts,
    sumDigits,
    oddCount,
    evenCount,
    has7,
    has0,
    maxRunLength,
    dominantDigit,
    dominantPair,
    last2,
  };
}

const BARCODE_PATTERN = /^\d{13}$/;

export class InvalidBarcodeError extends Error {
  constructor(message: string = "Barcode must be a 13-digit string.") {
    super(message);
    this.name = "InvalidBarcodeError";
  }
}

export const assertValidBarcode = (barcode: string): void => {
  if (!BARCODE_PATTERN.test(barcode)) {
    throw new InvalidBarcodeError();
  }
};

export class DuplicateRobotError extends Error {
  code = "already-exists";

  constructor(message: string = "You already have a robot from this barcode.") {
    super(message);
    this.name = "DuplicateRobotError";
  }
}

export const assertRobotNotExists = (exists: boolean): void => {
  if (exists) {
    throw new DuplicateRobotError();
  }
};

// バーコードを数値配列に分解
function parseBarcode(barcode: string): number[] {
  assertValidBarcode(barcode);
  return barcode.split('').map(Number);
}

// レアリティ決定 (1-5)
function calculateRarity(digits: number[]): number {
  // M1(2), M3(4), M5(6) と P2(8), P4(10) を使用
  const baseScore = ((digits[2] + digits[4] + digits[6]) % 10) * 10 + ((digits[8] + digits[10]) % 10);

  if (baseScore <= 69) return 1;      // Common (70%)
  if (baseScore <= 89) return 2;      // Uncommon (20%)
  if (baseScore <= 96) return 3;      // Rare (7%)
  if (baseScore <= 98) return 4;      // Epic (2%)
  return 5;                           // Legendary (1%)
}

// ステータス計算（ロール補正付き）
function calculateStats(digits: number[], rarity: number, role: RobotRole) {
  const totalPoints = 100 + (rarity * 20);
  const ratioSeed = digits[7] * 100 + digits[8] * 10 + digits[9];
  const ratioAttack = (ratioSeed % 100) / 100;
  const ratioDefense = ((ratioSeed * 3) % 100) / 100;
  const ratioHp = ((ratioSeed * 7) % 100) / 100;
  const totalRatio = ratioAttack + ratioDefense + ratioHp;
  const safeTotalRatio = totalRatio === 0 ? 1 : totalRatio;

  let baseAttack = Math.min(300, Math.max(10, Math.round((totalPoints * ratioAttack / safeTotalRatio) * 10)));
  let baseDefense = Math.min(300, Math.max(10, Math.round((totalPoints * ratioDefense / safeTotalRatio) * 10)));
  let baseHp = Math.min(3000, Math.max(100, Math.round((totalPoints * ratioHp / safeTotalRatio) * 100)));
  let baseSpeed = Math.round((baseAttack + baseDefense) / 2);

  // ロール補正（合計パワーを大きく変えないよう微調整）
  switch (role) {
    case 'ATTACKER':
      baseAttack = Math.round(baseAttack * 1.15);
      baseDefense = Math.round(baseDefense * 0.95);
      baseHp = Math.round(baseHp * 0.90);
      break;
    case 'TANK':
      baseAttack = Math.round(baseAttack * 0.90);
      baseDefense = Math.round(baseDefense * 1.15);
      baseHp = Math.round(baseHp * 1.10);
      baseSpeed = Math.round(baseSpeed * 0.95);
      break;
    case 'SPEED':
      baseAttack = Math.round(baseAttack * 0.95);
      baseDefense = Math.round(baseDefense * 0.95);
      baseHp = Math.round(baseHp * 0.95);
      baseSpeed = Math.round(baseSpeed * 1.15);
      break;
    case 'TRICKY':
      baseAttack = Math.round(baseAttack * 0.95);
      baseDefense = Math.round(baseDefense * 0.95);
      baseHp = Math.round(baseHp * 0.95);
      // TRICKYはパッシブ発動率向上（将来実装）で補う
      break;
    case 'BALANCE':
    default:
      // 補正なし
      break;
  }

  // 再度上下限を適用
  baseAttack = Math.min(300, Math.max(10, baseAttack));
  baseDefense = Math.min(300, Math.max(10, baseDefense));
  baseHp = Math.min(3000, Math.max(100, baseHp));

  return {
    baseHp,
    baseAttack,
    baseDefense,
    baseSpeed
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

// ファミリー決定 (1-5: DRINK, SNACK, DAILY, BEAUTY, OTHER)
function calculateFamily(digits: number[]): { id: number, name: string } {
  // Use digits[0] + digits[1] to determine family
  const familyId = ((digits[0] + digits[1]) % 5) + 1;
  return {
    id: familyId,
    name: FAMILY_NAMES[familyId - 1]
  };
}

// ロール決定（バーコード特徴から決定的に判定）
function calculateRole(digits: number[], features: BarcodeFeatures): { role: RobotRole, name: string, title: string } {
  const { oddCount, sumDigits, has7, digitCounts } = features;
  const tankScore = digitCounts[0] + digitCounts[8];

  // 高い数字（7以上）と低い数字（2以下）の個数をカウント
  const highCount = digits.filter(d => d >= 7).length;
  const lowCount = digits.filter(d => d <= 2).length;
  const balanceScore = Math.abs(highCount - lowCount);
  const trickySeed = (digits[5] + digits[11]) % 10;

  let role: RobotRole;

  // Feature-based role bias (priority order)
  if (has7 && trickySeed <= 2) {
    // has7 + low trickySeed -> TRICKY (~15%)
    role = 'TRICKY';
  } else if (oddCount >= 8) {
    // Many odd digits -> SPEED
    role = 'SPEED';
  } else if (tankScore >= 4) {
    // Many 0s and 8s -> TANK
    role = 'TANK';
  } else if (sumDigits >= 70) {
    // High sum -> ATTACKER (aggressive barcode)
    role = 'ATTACKER';
  } else if (trickySeed <= 1) {
    // ~20% fallback for TRICKY
    role = 'TRICKY';
  } else if (balanceScore <= 2) {
    // 高低がバランス良く分布 → BALANCE
    role = 'BALANCE';
  } else if (highCount >= lowCount + 3) {
    // 高い数字が多い → ATTACKER
    role = 'ATTACKER';
  } else if (lowCount >= highCount + 3) {
    // 低い数字が多い → TANK
    role = 'TANK';
  } else if (digits[12] >= 5) {
    // チェックディジットが5以上 → SPEED
    role = 'SPEED';
  } else {
    // デフォルト
    role = 'BALANCE';
  }

  return {
    role,
    name: ROLE_NAMES[role],
    title: ROLE_TITLES[role]
  };
}

// スロット決定 (0-19)
function calculateSlot(digits: number[]): number {
  // Use last 4 digits to get a slot within 0-19
  const seed = digits[9] * 1000 + digits[10] * 100 + digits[11] * 10 + digits[12];
  return seed % 20;
}

// パーツ選択（アンチセイミーロジック付き）
function selectParts(digits: number[], features: BarcodeFeatures): RobotParts {
  const parts: RobotParts = {
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

  // Anti-samey: if arms are identical, deterministic re-roll on right arm
  if (parts.armLeft === parts.armRight) {
    const offset = (features.last2 % 9) + 1; // 1-9 offset
    parts.armRight = ((parts.armRight + offset - 1) % 10) + 1;
  }

  // Anti-samey: if legs are identical, deterministic re-roll on right leg
  if (parts.legLeft === parts.legRight) {
    const offset = (features.sumDigits % 9) + 1;
    parts.legRight = ((parts.legRight + offset - 1) % 10) + 1;
  }

  return parts;
}

// 二つ名生成
function generateEpithet(digits: number[], role: RobotRole): string {
  const seed = digits[11] * 10 + digits[12]; // Use last 2 digits for stability
  const list = EPITHET_PREFIXES[role];
  const selected = list[seed % list.length];
  return `《${selected}》`;
}

// カラー生成 (ロールベース)
function generateRoleColors(role: RobotRole, rarity: number, digits: number[]): RobotColors {
  // Base Hues: Red, Yellow, Green, Blue, Purple
  const ROLE_HUES: Record<RobotRole, number> = {
    'ATTACKER': 0,    // Red
    'TANK': 45,       // Yellow/Orange
    'SPEED': 150,     // Green
    'BALANCE': 210,   // Blue
    'TRICKY': 270     // Purple
  };

  const baseHue = ROLE_HUES[role];
  // Slight hue shift based on barcode to add variety within role (+-15 deg)
  const hueShift = (digits[10] % 30) - 15;
  const finalHue = (baseHue + hueShift + 360) % 360;

  // Saturation/Lightness based on rarity
  // High rarity = More vibrant/Neon (Type B visual)
  const isTypeB = rarity >= 3;
  const saturation = isTypeB ? 85 : 70;
  const lightness = isTypeB ? 60 : 50;

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
    primary: hslToHex(finalHue, saturation, lightness),
    secondary: hslToHex((finalHue + 180) % 360, 20, 30), // Dark complementary
    accent: hslToHex((finalHue + 60) % 360, 90, 70), // Bright accent
    glow: hslToHex(finalHue, 100, isTypeB ? 80 : 70) // Glow color
  };
}

// メイン生成関数
export function generateRobotData(barcode: string, userId: string): RobotData {
  const digits = parseBarcode(barcode);
  const features = extractBarcodeFeatures(digits);

  const rarity = calculateRarity(digits);
  const roleInfo = calculateRole(digits, features);
  const stats = calculateStats(digits, rarity, roleInfo.role);
  const element = calculateElement(digits);
  const family = calculateFamily(digits);
  const slot = calculateSlot(digits);
  const parts = selectParts(digits, features);

  // Use new role-based color generation
  const colors = generateRoleColors(roleInfo.role, rarity, digits);

  // スキルはWeek4で継承に移行するため初期は空
  const skills: string[] = [];

  // 名前生成（ロール称号 + キーワード + プレフィックス + サフィックス）
  const prefixIndex = (digits[0] + digits[1]) % NAME_PREFIXES.length;
  const suffixIndex = (digits[2] + digits[3]) % NAME_SUFFIXES.length;

  // キーワード挿入（dominantPairに基づく）
  const keywords = NAME_KEYWORDS[features.dominantPair] || NAME_KEYWORDS['balance'];
  const keywordIndex = features.last2 % keywords.length;
  const keyword = keywords[keywordIndex];

  // 名前フォーマット: 「ロール称号・キーワードプレフィックスサフィックス」
  const name = `${roleInfo.title}・${keyword}${NAME_PREFIXES[prefixIndex]}${NAME_SUFFIXES[suffixIndex]}`;

  // 二つ名生成
  const epithet = generateEpithet(digits, roleInfo.role);

  // ビジュアルバリアントキー (0-99)
  const variantKey = features.last2;

  // 小さなステータスバイアス（+3〜8ポイント分配）
  const statBias = (features.sumDigits % 6) + 3; // 3-8 bonus points
  const biasTarget = features.dominantDigit % 4; // 0=HP, 1=ATK, 2=DEF, 3=SPD
  const biasedStats = { ...stats };
  switch (biasTarget) {
    case 0: biasedStats.baseHp += statBias * 10; break;
    case 1: biasedStats.baseAttack += statBias; break;
    case 2: biasedStats.baseDefense += statBias; break;
    case 3: biasedStats.baseSpeed += statBias; break;
  }

  return {
    userId,
    name,
    epithet,
    variantKey,
    sourceBarcode: barcode,

    rarity,
    rarityName: RARITY_NAMES[rarity - 1],
    ...biasedStats,
    elementType: element.id,
    elementName: element.name,

    family: family.id,
    familyName: family.name,
    slot,
    evolutionLevel: 0,

    // ロール情報
    role: roleInfo.role,
    roleName: roleInfo.name,
    roleTitle: roleInfo.title,

    level: 1,
    xp: 0,
    experience: 0,
    experienceToNext: 100,

    parts,
    colors,
    skills,
    equipped: {
      slot1: null,
      slot2: null
    },

    totalBattles: 0,
    totalWins: 0,
    isFavorite: false
  };
}



export const generateRobotFromBarcode = generateRobotData;
