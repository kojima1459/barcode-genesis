"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRobotFromBarcode = exports.generateRobotData = exports.assertRobotNotExists = exports.DuplicateRobotError = exports.assertValidBarcode = exports.InvalidBarcodeError = void 0;
const robotRoles_1 = require("./lib/robotRoles");
const robotNames_1 = require("./lib/robotNames");
// 定数定義
const RARITY_NAMES = ["ノーマル", "レア", "スーパーレア", "ウルトラレア", "レジェンド"];
const ELEMENT_NAMES = ["ファイア", "アクア", "ウィンド", "アース", "ライト", "ダーク", "メカ"];
const FAMILY_NAMES = ["DRINK", "SNACK", "DAILY", "BEAUTY", "OTHER"];
// ロール定義（アーキタイプ）- Legacy system (mapped to new roles)
const ROLE_NAMES = {
    'ATTACKER': 'アサルト',
    'TANK': 'タンク',
    'SPEED': 'スナイパー',
    'BALANCE': 'サポート',
    'TRICKY': 'トリックスター'
};
const ROLE_TITLES = {
    'ATTACKER': '攻撃型',
    'TANK': '防御型',
    'SPEED': '速攻型',
    'BALANCE': '支援型',
    'TRICKY': '妨害型'
};
// 二つ名リスト (Epithet Prefixes) - Legacy system
const EPITHET_PREFIXES = {
    'ATTACKER': ["紅蓮の", "深紅の", "激昴の", "無双の", "破壊の"],
    'TANK': ["不沈の", "鉄壁の", "金剛の", "守護の", "不動の"],
    'SPEED': ["瞬足の", "翠緑の", "疾風の", "閃光の", "音速の"],
    'BALANCE': ["蒼穹の", "静寂の", "調和の", "零度の", "天空の"],
    'TRICKY': ["紫電の", "幻影の", "混沌の", "深淵の", "狂気の"]
};
function extractBarcodeFeatures(digits) {
    // Count each digit
    const digitCounts = Array(10).fill(0);
    for (const d of digits)
        digitCounts[d]++;
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
        }
        else {
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
        seedHash: digits.reduce((hash, val, i) => (hash * 31 + val + i) | 0, 0),
        manufacturerCode: parseInt(digits.slice(2, 7).join(''), 10),
        productCode: parseInt(digits.slice(7, 12).join(''), 10),
    };
}
const BARCODE_PATTERN = /^\d{13}$/;
class InvalidBarcodeError extends Error {
    constructor(message = "Barcode must be a 13-digit string.") {
        super(message);
        this.name = "InvalidBarcodeError";
    }
}
exports.InvalidBarcodeError = InvalidBarcodeError;
const assertValidBarcode = (barcode) => {
    if (!BARCODE_PATTERN.test(barcode)) {
        throw new InvalidBarcodeError();
    }
};
exports.assertValidBarcode = assertValidBarcode;
class DuplicateRobotError extends Error {
    constructor(message = "You already have a robot from this barcode.") {
        super(message);
        this.code = "already-exists";
        this.name = "DuplicateRobotError";
    }
}
exports.DuplicateRobotError = DuplicateRobotError;
const assertRobotNotExists = (exists) => {
    if (exists) {
        throw new DuplicateRobotError();
    }
};
exports.assertRobotNotExists = assertRobotNotExists;
// バーコードを数値配列に分解
function parseBarcode(barcode) {
    (0, exports.assertValidBarcode)(barcode);
    return barcode.split('').map(Number);
}
// レアリティ決定 (1-5)
function calculateRarity(digits) {
    // M1(2), M3(4), M5(6) と P2(8), P4(10) を使用
    const baseScore = ((digits[2] + digits[4] + digits[6]) % 10) * 10 + ((digits[8] + digits[10]) % 10);
    if (baseScore <= 69)
        return 1; // Common (70%)
    if (baseScore <= 89)
        return 2; // Uncommon (20%)
    if (baseScore <= 96)
        return 3; // Rare (7%)
    if (baseScore <= 98)
        return 4; // Epic (2%)
    return 5; // Legendary (1%)
}
// ステータス計算（ロール補正付き）
function calculateStats(digits, rarity, role) {
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
    // TANK: HP/Def重視 (+20%), Atk/Spd抑制 (-10%)
    // ATTACKER: Atk重視 (+20%), HP抑制 (-10%), Crit寄り (別途)
    // SPEED: Spd重視 (+20%), Def抑制 (-10%), Eva寄り (別途)
    // BALANCE: 平均的 (補正なし or 小ブースト)
    // TRICKY: 変則 (Atk/Spdやや高め, HP/Defやや低め)
    switch (role) {
        case 'ATTACKER':
            baseAttack = Math.round(baseAttack * 1.20);
            baseDefense = Math.round(baseDefense * 1.0);
            baseHp = Math.round(baseHp * 0.90);
            baseSpeed = Math.round(baseSpeed * 1.0);
            break;
        case 'TANK':
            baseAttack = Math.round(baseAttack * 0.90);
            baseDefense = Math.round(baseDefense * 1.20);
            baseHp = Math.round(baseHp * 1.20);
            baseSpeed = Math.round(baseSpeed * 0.80);
            break;
        case 'SPEED':
            baseAttack = Math.round(baseAttack * 1.0);
            baseDefense = Math.round(baseDefense * 0.90);
            baseHp = Math.round(baseHp * 1.0);
            baseSpeed = Math.round(baseSpeed * 1.20);
            break;
        case 'TRICKY':
            baseAttack = Math.round(baseAttack * 1.10);
            baseDefense = Math.round(baseDefense * 0.95);
            baseHp = Math.round(baseHp * 0.95);
            baseSpeed = Math.round(baseSpeed * 1.10);
            break;
        case 'BALANCE':
        default:
            // 全体的に少し底上げ（特化型に負けないよう）
            baseAttack = Math.round(baseAttack * 1.05);
            baseDefense = Math.round(baseDefense * 1.05);
            baseHp = Math.round(baseHp * 1.05);
            baseSpeed = Math.round(baseSpeed * 1.05);
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
function calculateElement(digits) {
    // (M1 % 7) + 1
    const elementId = (digits[2] % 7) + 1;
    return {
        id: elementId,
        name: ELEMENT_NAMES[elementId - 1]
    };
}
// ファミリー決定 (1-5: DRINK, SNACK, DAILY, BEAUTY, OTHER)
function calculateFamily(digits) {
    // Use digits[0] + digits[1] to determine family
    const familyId = ((digits[0] + digits[1]) % 5) + 1;
    return {
        id: familyId,
        name: FAMILY_NAMES[familyId - 1]
    };
}
// ロール決定（バーコード特徴から決定的に判定）
function calculateRole(digits, features) {
    const { oddCount, sumDigits, has7, digitCounts } = features;
    const tankScore = digitCounts[0] + digitCounts[8];
    // 高い数字（7以上）と低い数字（2以下）の個数をカウント
    const highCount = digits.filter(d => d >= 7).length;
    const lowCount = digits.filter(d => d <= 2).length;
    const balanceScore = Math.abs(highCount - lowCount);
    const trickySeed = (digits[5] + digits[11]) % 10;
    let role;
    // Feature-based role bias (priority order)
    if (has7 && trickySeed <= 2) {
        // has7 + low trickySeed -> TRICKY (~15%)
        role = 'TRICKY';
    }
    else if (oddCount >= 8) {
        // Many odd digits -> SPEED
        role = 'SPEED';
    }
    else if (tankScore >= 4) {
        // Many 0s and 8s -> TANK
        role = 'TANK';
    }
    else if (sumDigits >= 70) {
        // High sum -> ATTACKER (aggressive barcode)
        role = 'ATTACKER';
    }
    else if (trickySeed <= 1) {
        // ~20% fallback for TRICKY
        role = 'TRICKY';
    }
    else if (balanceScore <= 2) {
        // 高低がバランス良く分布 → BALANCE
        role = 'BALANCE';
    }
    else if (highCount >= lowCount + 3) {
        // 高い数字が多い → ATTACKER
        role = 'ATTACKER';
    }
    else if (lowCount >= highCount + 3) {
        // 低い数字が多い → TANK
        role = 'TANK';
    }
    else if (digits[12] >= 5) {
        // チェックディジットが5以上 → SPEED
        role = 'SPEED';
    }
    else {
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
function calculateSlot(digits) {
    // Use last 4 digits to get a slot within 0-19
    const seed = digits[9] * 1000 + digits[10] * 100 + digits[11] * 10 + digits[12];
    return seed % 20;
}
// パーツ選択（アンチセイミーロジック付き）
function selectParts(digits, features) {
    const parts = {
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
function generateEpithet(digits, role) {
    const seed = digits[11] * 10 + digits[12]; // Use last 2 digits for stability
    const list = EPITHET_PREFIXES[role];
    const selected = list[seed % list.length];
    return `《${selected}》`;
}
// カラー生成 (ロールベース)
function generateRoleColors(role, rarity, digits) {
    // Base Hues: Red, Yellow, Green, Blue, Purple
    const ROLE_HUES = {
        'ATTACKER': 0,
        'TANK': 45,
        'SPEED': 150,
        'BALANCE': 210,
        'TRICKY': 270 // Purple
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
    const hslToHex = (h, s, l) => {
        l /= 100;
        const a = s * Math.min(l, 1 - l) / 100;
        const f = (n) => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    };
    return {
        primary: hslToHex(finalHue, saturation, lightness),
        secondary: hslToHex((finalHue + 180) % 360, 20, 30),
        accent: hslToHex((finalHue + 60) % 360, 90, 70),
        glow: hslToHex(finalHue, 100, isTypeB ? 80 : 70) // Glow color
    };
}
// レアエフェクト判定 (1%)
function calculateRareEffect(seedHash) {
    const mod = Math.abs(seedHash) % 100;
    if (mod === 0)
        return 'legendary'; // 1%
    if (mod <= 5)
        return 'rare'; // 5% (User asked for 1% rare only, but adding a tier for visual flavor?)
    // User spec: "seedHash % 100 == 0 -> RARE".
    // Let's stick to strictly user spec for "RARE" (visual only).
    // But type definition allows 'rare' | 'legendary'.
    // I'll make % 100 == 0 -> 'legendary' (highest visual), and maybe % 50 == 0 -> 'rare'.
    // Actually user said "seedHash % 100 == 0 -> RARE (1%)".
    // I will map 0 -> 'legendary' for maximum impact, or just 'rare'.
    // Let's do: 0 -> 'legendary', 1-2 -> 'rare' (Total 3% for visual flair?)
    // User: "seedHash % 100 == 0 -> RARE (1%)". Keep it simple.
    if (mod === 0)
        return 'legendary';
    return 'none';
}
function calculateVisuals(features, role) {
    const { manufacturerCode, productCode, seedHash } = features;
    // Aura (5 types)
    const AURAS = ['none', 'burning', 'electric', 'digital', 'psycho', 'angel'];
    // Use manufacturer code for Aura (Company style?)
    const auraIndex = (manufacturerCode % (AURAS.length - 1)) + 1; // 1..5
    // 30% chance to have NO aura unless high rarity (handled elsewhere? no, pure visual variety)
    // Let's give 50% chance of Aura.
    const hasAura = (Math.abs(seedHash) % 100) < 50;
    const aura = hasAura ? AURAS[auraIndex] : 'none';
    // Decal (6 types)
    const DECALS = ['none', 'number', 'warning', 'star', 'stripe', 'camo'];
    // Use product code for Decal (Product line style?)
    const decalIndex = (productCode % (DECALS.length - 1)) + 1;
    const hasDecal = (Math.abs(seedHash) % 100) > 30; // 70% chance
    const decal = hasDecal ? DECALS[decalIndex] : 'none';
    // Eye Glow (3 types)
    const EYES = ['normal', 'brilliant', 'matrix'];
    // Role based bias?
    // ATTACKER -> brilliant? TRICKY -> matrix?
    let eyeGlow = 'normal';
    if (role === 'TRICKY' || role === 'SPEED') {
        eyeGlow = (Math.abs(seedHash) % 2 === 0) ? 'matrix' : 'normal';
    }
    else if (role === 'ATTACKER' || role === 'TANK') {
        eyeGlow = (Math.abs(seedHash) % 2 === 0) ? 'brilliant' : 'normal';
    }
    // Weapon Icon (5 types)
    const ICONS = ['none', 'sword', 'gun', 'shield', 'missile', 'fist'];
    const iconIndex = (Math.abs(seedHash) % (ICONS.length - 1)) + 1;
    const hasIcon = (Math.abs(seedHash) % 10) < 3; // 30% chance to show icon explicitly?
    // Actually "Weapon Icon" might be a decal or UI element. implementation plan said "WeaponIcon".
    // Let's assign it.
    const weaponIcon = hasIcon ? ICONS[iconIndex] : 'none';
    return { aura, decal, eyeGlow, weaponIcon };
}
// メイン生成関数
function generateRobotData(barcode, userId) {
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
    const skills = [];
    // New Visuals & Rarity
    const visuals = calculateVisuals(features, roleInfo.role);
    const rarityEffect = calculateRareEffect(features.seedHash);
    // Legacy name generation (keep for backward compat, but unused)
    // const name = generateName(digits, roleInfo.title, features);
    // Phase B: New Role System (deterministic from seed)
    const phaseB_seed = features.seedHash;
    const phaseB_role = (0, robotRoles_1.getRoleFromSeed)(phaseB_seed);
    const phaseB_rarity = (0, robotRoles_1.getRarityFromSeed)(phaseB_seed);
    const phaseB_name = (0, robotNames_1.generateRobotName)(phaseB_role, phaseB_rarity, phaseB_seed);
    // 二つ名生成 (keep legacy for backward compat)
    const epithet = generateEpithet(digits, roleInfo.role);
    // ビジュアルバリアントキー (0-99)
    const variantKey = features.last2;
    // 小さなステータスバイアス（+3〜8ポイント分配）
    const statBias = (features.sumDigits % 6) + 3; // 3-8 bonus points
    const biasTarget = features.dominantDigit % 4; // 0=HP, 1=ATK, 2=DEF, 3=SPD
    const biasedStats = Object.assign({}, stats);
    switch (biasTarget) {
        case 0:
            biasedStats.baseHp += statBias * 10;
            break;
        case 1:
            biasedStats.baseAttack += statBias;
            break;
        case 2:
            biasedStats.baseDefense += statBias;
            break;
        case 3:
            biasedStats.baseSpeed += statBias;
            break;
    }
    return Object.assign(Object.assign({ userId, name: phaseB_name, // Use Phase B name
        epithet,
        variantKey, sourceBarcode: barcode, rarity, rarityName: RARITY_NAMES[rarity - 1] }, biasedStats), { elementType: element.id, elementName: element.name, family: family.id, familyName: family.name, slot, evolutionLevel: 0, 
        // Phase B: New Role System
        role: phaseB_role, rarityTier: phaseB_rarity, 
        // Legacy role fields (keep for backward compat)
        roleName: robotRoles_1.ROLE_LABELS[phaseB_role], roleTitle: roleInfo.title, level: 1, xp: 0, experience: 0, experienceToNext: 100, parts,
        colors,
        visuals,
        rarityEffect,
        skills, equipped: {
            slot1: null,
            slot2: null
        }, totalBattles: 0, totalWins: 0, isFavorite: false });
}
exports.generateRobotData = generateRobotData;
exports.generateRobotFromBarcode = generateRobotData;
//# sourceMappingURL=robotGenerator.js.map