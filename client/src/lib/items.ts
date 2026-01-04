import { getCachedLanguage } from '@/contexts/LanguageContext';

export type ShopItemCategory = 'boost' | 'battle' | 'cosmetic';

export type ShopItem = {
  id: string;
  name: string;
  nameJa: string;
  description: string;
  descriptionJa: string;
  price: number;
  tokenCost?: number;
  category: ShopItemCategory;
  effect?: {
    stat?: 'hp' | 'attack' | 'defense' | 'speed';
    value?: number;
    duration?: 'permanent' | 'battle';
  };
};

export const SHOP_ITEMS: ShopItem[] = [
  // === ロボット強化アイテム（永続効果） ===
  {
    id: "power_core",
    name: "Power Core",
    nameJa: "パワーコア",
    description: "Permanently increases robot attack by 5",
    descriptionJa: "ロボットの攻撃力を永久に+5",
    price: 100,
    category: 'boost',
    effect: { stat: 'attack', value: 5, duration: 'permanent' }
  },
  {
    id: "shield_plate",
    name: "Shield Plate",
    nameJa: "シールドプレート",
    description: "Permanently increases robot defense by 5",
    descriptionJa: "ロボットの防御力を永久に+5",
    price: 80,
    category: 'boost',
    effect: { stat: 'defense', value: 5, duration: 'permanent' }
  },
  {
    id: "speed_chip",
    name: "Speed Chip",
    nameJa: "スピードチップ",
    description: "Permanently increases robot speed by 5",
    descriptionJa: "ロボットの速度を永久に+5",
    price: 60,
    category: 'boost',
    effect: { stat: 'speed', value: 5, duration: 'permanent' }
  },
  {
    id: "hp_module",
    name: "HP Module",
    nameJa: "HPモジュール",
    description: "Permanently increases robot HP by 50",
    descriptionJa: "ロボットのHPを永久に+50",
    price: 120,
    category: 'boost',
    effect: { stat: 'hp', value: 50, duration: 'permanent' }
  },

  // === バトル用アイテム（1回使用） ===
  {
    id: "repair_kit",
    name: "Repair Kit",
    nameJa: "リペアキット",
    description: "Restores 30% HP during battle",
    descriptionJa: "バトル中にHPを30%回復",
    price: 50,
    category: 'battle',
    effect: { stat: 'hp', value: 30, duration: 'battle' }
  },
  {
    id: "attack_boost",
    name: "Attack Boost",
    nameJa: "アタックブースト",
    description: "Increases attack by 20% for one battle",
    descriptionJa: "1バトルの間、攻撃力+20%",
    price: 40,
    category: 'battle',
    effect: { stat: 'attack', value: 20, duration: 'battle' }
  },
  {
    id: "defense_boost",
    name: "Defense Boost",
    nameJa: "ディフェンスブースト",
    description: "Increases defense by 20% for one battle",
    descriptionJa: "1バトルの間、防御力+20%",
    price: 40,
    category: 'battle',
    effect: { stat: 'defense', value: 20, duration: 'battle' }
  },
  {
    id: "critical_lens",
    name: "Critical Lens",
    nameJa: "クリティカルレンズ",
    description: "Doubles critical hit chance for one battle",
    descriptionJa: "1バトルの間、クリティカル率2倍",
    price: 70,
    category: 'battle'
  },
  {
    id: "BOOST",
    name: "Boost Drink",
    nameJa: "ブーストドリンク",
    description: "Boosts the next attack damage by 15%",
    descriptionJa: "次の攻撃ダメージを15%強化",
    price: 10,
    tokenCost: 1,
    category: 'battle'
  },
  {
    id: "SHIELD",
    name: "Shield Projector",
    nameJa: "シールド投射器",
    description: "Reduces the next incoming damage by 15%",
    descriptionJa: "次に受けるダメージを15%軽減",
    price: 10,
    tokenCost: 1,
    category: 'battle'
  },
  {
    id: "JAMMER",
    name: "Jammer Charm",
    nameJa: "ジャマーチャーム",
    description: "Cancels the opponent's next critical hit",
    descriptionJa: "相手の次のクリティカルを無効化",
    price: 25,
    tokenCost: 2,
    category: 'battle'
  },
  {
    id: "DRONE",
    name: "Support Drone",
    nameJa: "サポートドローン",
    description: "Token-only craft item",
    descriptionJa: "チップだけで作れるバトル用ドローン",
    price: 0,
    tokenCost: 3,
    category: 'battle'
  },

  // === カスタマイズ（スキン・パーツ） ===
  {
    id: "gold_coating",
    name: "Gold Coating",
    nameJa: "ゴールドコーティング",
    description: "Give your robot a shiny golden appearance",
    descriptionJa: "ロボットを金色に輝かせる",
    price: 200,
    category: 'cosmetic'
  },
  {
    id: "neon_glow",
    name: "Neon Glow",
    nameJa: "ネオングロー",
    description: "Add a neon glow effect to your robot",
    descriptionJa: "ロボットにネオン発光エフェクトを追加",
    price: 150,
    category: 'cosmetic'
  },
  {
    id: "flame_aura",
    name: "Flame Aura",
    nameJa: "フレイムオーラ",
    description: "Surround your robot with flames",
    descriptionJa: "ロボットに炎のオーラを纏わせる",
    price: 180,
    category: 'cosmetic'
  },
  {
    id: "ice_armor",
    name: "Ice Armor",
    nameJa: "アイスアーマー",
    description: "Encase your robot in icy armor",
    descriptionJa: "ロボットに氷の鎧を装着",
    price: 180,
    category: 'cosmetic'
  }
];

export const getItemLabel = (itemId: string, lang?: 'en' | 'ja') => {
  const item = SHOP_ITEMS.find((entry) => entry.id === itemId);
  if (!item) return itemId;
  const actualLang = lang ?? getCachedLanguage();
  return actualLang === 'ja' ? item.nameJa : item.name;
};

export const getItemDescription = (itemId: string, lang?: 'en' | 'ja') => {
  const item = SHOP_ITEMS.find((entry) => entry.id === itemId);
  if (!item) return '';
  const actualLang = lang ?? getCachedLanguage();
  return actualLang === 'ja' ? item.descriptionJa : item.description;
};

export const getCategoryLabel = (category: ShopItemCategory, lang?: 'en' | 'ja') => {
  const labels: Record<ShopItemCategory, { en: string; ja: string }> = {
    boost: { en: 'Robot Upgrades', ja: 'ロボット強化' },
    battle: { en: 'Battle Items', ja: 'バトルアイテム' },
    cosmetic: { en: 'Cosmetics', ja: 'カスタマイズ' }
  };
  const actualLang = lang ?? getCachedLanguage();
  return labels[category]?.[actualLang] || category;
};
