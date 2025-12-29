"use strict";
/**
 * BattleEngine v2: Stance System
 * Rock-paper-scissors style prediction game
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStanceIcon = exports.getStanceMultiplier = exports.resolveStance = exports.pickStance = exports.getStanceWeights = void 0;
/**
 * Generate stance weights based on robot's "personality"
 * Uses barcode digits and parts to create deterministic bias
 */
const getStanceWeights = (robot) => {
    const barcode = robot.sourceBarcode || "";
    const parts = robot.parts;
    // Base weights
    let attack = 1.0;
    let guard = 1.0;
    let trick = 1.0;
    // Barcode末尾桁による性格付け
    if (barcode.length > 0) {
        const lastDigit = parseInt(barcode[barcode.length - 1], 10) || 0;
        const secondLast = barcode.length > 1 ? parseInt(barcode[barcode.length - 2], 10) || 0 : 0;
        // 末尾が偶数: 攻撃的
        if (lastDigit % 2 === 0)
            attack += 0.3;
        // 末尾が奇数: 防御的
        else
            guard += 0.3;
        // ゾロ目チェック: トリッキー
        if (lastDigit === secondLast)
            trick += 0.5;
        // 連番チェック (1234, 5678等): バランス型
        if (Math.abs(lastDigit - secondLast) === 1) {
            attack += 0.15;
            guard += 0.15;
        }
    }
    // Parts による性格付け
    if (parts) {
        // High weapon value: aggressive
        if (parts.weapon >= 7)
            attack += 0.4;
        else if (parts.weapon <= 3)
            guard += 0.2;
        // High backpack value: tactical
        if (parts.backpack >= 7)
            trick += 0.3;
        // High accessory: defensive
        if (parts.accessory >= 7)
            guard += 0.3;
    }
    // Normalize to probabilities
    const total = attack + guard + trick;
    return {
        attack: attack / total,
        guard: guard / total,
        trick: trick / total
    };
};
exports.getStanceWeights = getStanceWeights;
/**
 * Pick stance using SeededRandom and weights
 */
const pickStance = (rng, weights) => {
    const roll = rng.next();
    if (roll < weights.attack)
        return "ATTACK";
    if (roll < weights.attack + weights.guard)
        return "GUARD";
    return "TRICK";
};
exports.pickStance = pickStance;
/**
 * Resolve stance matchup
 * ATTACK > TRICK > GUARD > ATTACK
 */
const resolveStance = (attacker, defender) => {
    if (attacker === defender)
        return "DRAW";
    // Attacker wins
    if ((attacker === "ATTACK" && defender === "TRICK") ||
        (attacker === "TRICK" && defender === "GUARD") ||
        (attacker === "GUARD" && defender === "ATTACK")) {
        return "WIN";
    }
    // Attacker loses
    return "LOSE";
};
exports.resolveStance = resolveStance;
/**
 * Get damage multiplier based on stance outcome
 * @param outcome The stance resolution result
 * @param isAttacker Whether this is for the attacking robot
 */
const getStanceMultiplier = (outcome, isAttacker) => {
    switch (outcome) {
        case "WIN":
            return isAttacker ? 1.25 : 0.8;
        case "LOSE":
            return isAttacker ? 0.8 : 1.25;
        case "DRAW":
        default:
            return 1.0;
    }
};
exports.getStanceMultiplier = getStanceMultiplier;
/**
 * Get stance icon for UI display
 */
const getStanceIcon = (stance) => {
    switch (stance) {
        case "ATTACK": return "⚔️";
        case "GUARD": return "🛡️";
        case "TRICK": return "🎭";
    }
};
exports.getStanceIcon = getStanceIcon;
//# sourceMappingURL=battleStance.js.map