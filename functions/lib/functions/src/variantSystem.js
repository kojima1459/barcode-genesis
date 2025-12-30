"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveVariantAppearance = exports.resolveVariantStats = exports.generateVariantRecipe = void 0;
const seededRandom_1 = require("./seededRandom");
const generateVariantRecipe = (uid, robotAId, robotBId) => {
    const sortedIds = [robotAId, robotBId].sort();
    // seed = fusion_{uid}_{sortedA}_{sortedB}
    const seedString = `fusion_${uid}_${sortedIds[0]}_${sortedIds[1]}`;
    const rng = new seededRandom_1.SeededRandom(seedString);
    // Arms: Random
    const armsSource = rng.nextBool() ? 'A' : 'B';
    // Legs: Random
    const legsSource = rng.nextBool() ? 'A' : 'B';
    // Accessory: 45/45/10
    const accRoll = rng.next();
    let accessorySource = 'NONE';
    if (accRoll < 0.45)
        accessorySource = 'A';
    else if (accRoll < 0.90)
        accessorySource = 'B';
    // Palette: A/B/HALF
    const palRoll = rng.nextInt(0, 2);
    const paletteMode = palRoll === 0 ? 'A' : palRoll === 1 ? 'B' : 'HALF';
    // Overlay
    const overlays = ["glitch", "golden", "shadow", "cyber", "rusty", "neon"];
    let overlayKey = undefined;
    if (rng.nextBool()) {
        const idx = rng.nextInt(0, overlays.length - 1);
        overlayKey = overlays[idx];
    }
    return {
        headSource: 'A',
        bodySource: 'B',
        armsSource,
        legsSource,
        accessorySource,
        paletteMode,
        overlayKey
    };
};
exports.generateVariantRecipe = generateVariantRecipe;
const resolveVariantStats = (robotA, robotB) => {
    return {
        baseHp: Math.floor((robotA.baseHp + robotB.baseHp) / 2),
        baseAttack: Math.floor((robotA.baseAttack + robotB.baseAttack) / 2),
        baseDefense: Math.floor((robotA.baseDefense + robotB.baseDefense) / 2),
        baseSpeed: Math.floor((robotA.baseSpeed + robotB.baseSpeed) / 2),
    };
};
exports.resolveVariantStats = resolveVariantStats;
const getPart = (source, partName, partsA, partsB) => {
    return source === 'A' ? partsA[partName] : partsB[partName];
};
const resolveVariantAppearance = (recipe, robotA, robotB) => {
    const pA = robotA.parts;
    const pB = robotB.parts;
    const parts = {
        head: pA.head,
        face: pA.face,
        body: pB.body,
        backpack: pB.backpack,
        armLeft: getPart(recipe.armsSource, 'armLeft', pA, pB),
        armRight: getPart(recipe.armsSource, 'armRight', pA, pB),
        weapon: getPart(recipe.armsSource, 'weapon', pA, pB),
        legLeft: getPart(recipe.legsSource, 'legLeft', pA, pB),
        legRight: getPart(recipe.legsSource, 'legRight', pA, pB),
        // Accessory
        accessory: recipe.accessorySource === 'NONE' ? 0 :
            (recipe.accessorySource === 'A' ? pA.accessory : pB.accessory),
    };
    let colors;
    if (recipe.paletteMode === 'A') {
        colors = Object.assign({}, robotA.colors);
    }
    else if (recipe.paletteMode === 'B') {
        colors = Object.assign({}, robotB.colors);
    }
    else {
        // HALF
        colors = {
            primary: robotA.colors.primary,
            secondary: robotA.colors.secondary,
            accent: robotB.colors.accent,
            glow: robotB.colors.glow
        };
    }
    return { parts, colors };
};
exports.resolveVariantAppearance = resolveVariantAppearance;
//# sourceMappingURL=variantSystem.js.map