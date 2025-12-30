// ロボットのパーツ構成
export interface RobotParts {
  head: number;      // 1-10
  face: number;      // 1-10
  body: number;      // 1-10
  armLeft: number;   // 1-10
  armRight: number;  // 1-10
  legLeft: number;   // 1-10
  legRight: number;  // 1-10
  backpack: number;  // 1-10
  weapon: number;    // 1-10
  accessory: number; // 1-10
}

// ロボットのカラーパレット
export interface RobotColors {
  primary: string;   // HEX color
  secondary: string; // HEX color
  accent: string;    // HEX color
  glow: string;      // HEX color
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  type: 'attack' | 'defense' | 'heal' | 'buff' | 'debuff';
  power: number;
  accuracy: number;
  triggerRate: number; // 発動率 (0.0 - 1.0)
}

// ロボットデータ
export interface RobotData {
  id?: string;
  userId: string;
  name: string;
  sourceBarcode: string;

  // ステータス
  rarity: number;           // 1-5
  rarityName: string;       // "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary"
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  baseSpeed: number;
  elementType: number;      // 1-7
  elementName: string;

  // レベル
  level?: number;
  xp?: number;
  exp?: number; // legacy field
  experience?: number; // legacy field
  experienceToNext?: number; // legacy field

  // 外観
  parts: RobotParts;
  colors: RobotColors;

  // スキル
  skills?: Array<string | Skill>; // skill IDs (string) or legacy skill objects

  equipped?: {
    slot1?: string | null;
    slot2?: string | null;
  };

  // メタデータ
  createdAt?: Date | any;    // Firestore Timestamp
  updatedAt?: Date | any;

  // 図鑑・進化用
  family?: number;           // 1-5 (DRINK, SNACK, DAILY, BEAUTY, OTHER)
  familyName?: string;
  slot?: number;             // 0-19
  evolutionLevel?: number;   // 0+

  // 統計
  totalBattles: number;
  totalWins: number;
  isFavorite: boolean;
}

// API リクエスト/レスポンス
export interface GenerateRobotRequest {
  barcode: string;
}

export interface GenerateRobotResponse {
  robotId: string;
  robot: RobotData;
  version?: string;
}

// ============================================
// BattleEngine v2 Types
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
  gauge: number;        // 0-100
  isActive: boolean;    // Active this turn?
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

  // BattleEngine v2: Stance
  stanceAttacker?: Stance;
  stanceDefender?: Stance;
  stanceOutcome?: StanceOutcome;
  stanceMultiplier?: number;

  // BattleEngine v2: Overdrive
  overdriveTriggered?: boolean;
  overdriveMessage?: string;
  attackerOverdriveGauge?: number;
  defenderOverdriveGauge?: number;

  // BattleEngine v2: Passive
  passiveTriggered?: PassiveTrigger;

  // Cheer System (応援)
  cheerApplied?: boolean;
  cheerSide?: 'P1' | 'P2';
  cheerMultiplier?: number;  // 1.2

  // Pre-Battle Item System
  itemApplied?: boolean;
  itemSide?: 'P1' | 'P2';
  itemType?: BattleItemType;
  itemEffect?: string;  // e.g., "×1.15", "×0.85", "CRIT BLOCKED"
  itemEvent?: "ITEM_USED" | "ITEM_APPLIED";
  itemMessage?: string;

  // BattleEngine v2: Guard / Pursuit / Stun
  guarded?: boolean;
  guardMultiplier?: number;
  pursuitDamage?: number;
  followUpDamage?: number;
  stunApplied?: boolean;
  stunTargetId?: string;
  stunned?: boolean;
}

// ============================================
// Pre-Battle Item Types
// ============================================

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
    credits?: number;
    dailyCapApplied?: boolean;
    dailyCreditsCapApplied?: boolean;
    creditsReward?: number;
    xpReward?: number;
    scanTokensGained?: number;
    xp?: number;
    xpBefore?: number;
    xpAfter?: number;
    levelBefore?: number;
    levelAfter?: number;
    capped?: boolean;
    capRemaining?: number;
    reason?: "DAILY_CAP" | null;
  };
  totalDamageP1?: number;
  totalDamageP2?: number;
  turnCount?: number;
}

export interface BattleRewardData {
  battleId: string;
  userId: string;
  result: 'win' | 'loss' | 'draw';
  creditsEarned: number;
  xpEarned: number;
  createdAt: any; // Firestore Timestamp
}

// ============================================
// ============================================
// Variant (Cosmetic Synthesis) Types
// ============================================

export type VariantSource = 'A' | 'B';
export type VariantPaletteMode = 'A' | 'B' | 'HALF';

export interface AppearanceRecipe {
  headSource: VariantSource;
  bodySource: VariantSource;
  armsSource: VariantSource;
  legsSource: VariantSource;
  accessorySource: VariantSource | 'NONE';
  paletteMode: VariantPaletteMode;
  overlayKey?: string;
}

export interface VariantData {
  id?: string;
  name?: string;
  parentRobotIds: [string, string]; // [A, B]
  appearanceRecipe: AppearanceRecipe;
  parts: RobotParts;
  colors: RobotColors;
  createdAt?: any;
  updatedAt?: any;
}

export type FighterRef =
  | { kind: 'robot'; id: string }
  | { kind: 'variant'; id: string };
