/**
 * Robot Name Generation - Phase B
 * 
 * Generates robot names with epithets based on role/rarity/seed.
 * Format: "<Epithet> <BaseName>"
 * 
 * All generation is deterministic (no Math.random()).
 */

import { RobotRole, RobotRarity } from './robotRoles';

/**
 * Epithet lists by role (Japanese)
 */
const EPITHETS_BY_ROLE: Record<RobotRole, string[]> = {
    striker: [
        '烈火の', '疾風の', '鋭刃の', '雷撃の', '破壊の',
        '猛攻の', '爆炎の', '閃光の', '豪腕の', '無双の'
    ],
    tank: [
        '鉄壁の', '不屈の', '守護の', '堅牢の', '重装の',
        '不動の', '要塞の', '盾の', '防壁の', '鋼の'
    ],
    speed: [
        '影走りの', '神速の', '閃光の', '疾走の', '迅雷の',
        '風の', '稲妻の', '瞬間の', '軽業の', '飛翔の'
    ],
    support: [
        '慈愛の', '援護の', '希望の', '祝福の', '癒しの',
        '献身の', '守り手', '導きの', '奇跡の', '光の'
    ],
    balanced: [
        '勇敢な', '誇り高き', '不屈の', '英雄の', '伝説の',
        '無敵の', '栄光の', '王者の', '覇者の', '至高の'
    ]
};

/**
 * Legendary-specific epithets (override for legendary rarity)
 */
const LEGENDARY_EPITHETS = [
    '伝説の', '神話の', '不滅の', '永遠の', '絶対の',
    '至高の', '究極の', '無限の', '超越の', '覇王の'
];

/**
 * Base name syllables for generation
 * Combines 2 syllables to create robot names
 */
const NAME_SYLLABLES_FIRST = [
    'ゼフィ', 'グラン', 'ブレイ', 'サン', 'クロ',
    'レオ', 'ガイ', 'カイ', 'ジン', 'リュウ',
    'セイ', 'ソー', 'ボル', 'フレイ', 'ダイ'
];

const NAME_SYLLABLES_SECOND = [
    'オス', 'ドン', 'ガー', 'ダー', 'ロン',
    'ム', 'ス', 'ン', 'ル', 'ド',
    'ク', 'ト', 'バ', 'ラ', 'ザ'
];

/**
 * Generate epithet from role, rarity, and seed
 */
export function generateEpithet(role: RobotRole, rarity: RobotRarity, seed: number): string {
    // Legendary always gets legendary epithets
    if (rarity === 'legendary') {
        const index = Math.floor((seed / 100) % LEGENDARY_EPITHETS.length);
        return LEGENDARY_EPITHETS[index];
    }

    // Otherwise use role-based epithets
    const epithets = EPITHETS_BY_ROLE[role];
    const index = Math.floor((seed / 1000) % epithets.length);
    return epithets[index];
}

/**
 * Generate base robot name from seed
 */
export function generateBaseName(seed: number): string {
    const firstIndex = Math.floor((seed / 100) % NAME_SYLLABLES_FIRST.length);
    const secondIndex = Math.floor((seed / 10) % NAME_SYLLABLES_SECOND.length);

    return NAME_SYLLABLES_FIRST[firstIndex] + NAME_SYLLABLES_SECOND[secondIndex];
}

/**
 * Generate full robot name (epithet + base name)
 */
export function generateRobotName(role: RobotRole, rarity: RobotRarity, seed: number): string {
    const epithet = generateEpithet(role, rarity, seed);
    const baseName = generateBaseName(seed);

    return `${epithet}${baseName}`;
}
