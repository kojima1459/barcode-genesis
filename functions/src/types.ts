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
  level: number;
  experience: number;
  experienceToNext: number;
  
  // 外観
  parts: RobotParts;
  colors: RobotColors;
  
  // スキル
  skills: number[];         // スキルIDの配列
  
  // メタデータ
  createdAt: Date | any;    // Firestore Timestamp
  updatedAt: Date | any;
  
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
  success: boolean;
  robot?: RobotData;
  error?: string;
}
