"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRobotFromBarcode = exports.generateRobotData = exports.assertRobotNotExists = exports.DuplicateRobotError = exports.assertValidBarcode = exports.InvalidBarcodeError = void 0;
// 定数定義
const RARITY_NAMES = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];
const ELEMENT_NAMES = ["Fire", "Water", "Wind", "Earth", "Light", "Dark", "Machine"];
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
// ステータス計算
function calculateStats(digits, rarity) {
    const totalPoints = 100 + (rarity * 20);
    const ratioSeed = digits[7] * 100 + digits[8] * 10 + digits[9];
    const ratioAttack = (ratioSeed % 100) / 100;
    const ratioDefense = ((ratioSeed * 3) % 100) / 100;
    const ratioHp = ((ratioSeed * 7) % 100) / 100;
    const totalRatio = ratioAttack + ratioDefense + ratioHp;
    const safeTotalRatio = totalRatio === 0 ? 1 : totalRatio;
    const baseAttack = Math.min(300, Math.max(10, Math.round((totalPoints * ratioAttack / safeTotalRatio) * 10)));
    const baseDefense = Math.min(300, Math.max(10, Math.round((totalPoints * ratioDefense / safeTotalRatio) * 10)));
    const baseHp = Math.min(3000, Math.max(100, Math.round((totalPoints * ratioHp / safeTotalRatio) * 100)));
    const baseSpeed = Math.round((baseAttack + baseDefense) / 2);
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
// パーツ選択
function selectParts(digits) {
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
function generateColors(digits) {
    // ベース色相 (0-360)
    const baseHue = ((digits[10] * 10 + digits[11]) * 3.6) % 360;
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
        primary: hslToHex(baseHue, 70, 50),
        secondary: hslToHex((baseHue + 180) % 360, 60, 40),
        accent: hslToHex((baseHue + 60) % 360, 80, 60),
        glow: hslToHex(baseHue, 100, 70) // 発光色
    };
}
// メイン生成関数
function generateRobotData(barcode, userId) {
    const digits = parseBarcode(barcode);
    const rarity = calculateRarity(digits);
    const stats = calculateStats(digits, rarity);
    const element = calculateElement(digits);
    const parts = selectParts(digits);
    const colors = generateColors(digits);
    // スキルはWeek4で継承に移行するため初期は空
    const skills = [];
    // 名前生成 (簡易版: 属性 + レアリティ + IDの一部)
    const name = `${element.name} ${RARITY_NAMES[rarity - 1]} Unit-${barcode.slice(-4)}`;
    return Object.assign(Object.assign({ userId,
        name, sourceBarcode: barcode, rarity, rarityName: RARITY_NAMES[rarity - 1] }, stats), { elementType: element.id, elementName: element.name, level: 1, xp: 0, experience: 0, experienceToNext: 100, parts,
        colors,
        skills, equipped: {
            slot1: null,
            slot2: null
        }, totalBattles: 0, totalWins: 0, isFavorite: false });
}
exports.generateRobotData = generateRobotData;
exports.generateRobotFromBarcode = generateRobotData;
//# sourceMappingURL=robotGenerator.js.map