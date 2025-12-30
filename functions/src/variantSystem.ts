import { RobotData, AppearanceRecipe, VariantSource, RobotParts, RobotColors } from './types';
import { SeededRandom } from './seededRandom';

export const generateVariantRecipe = (uid: string, robotAId: string, robotBId: string): AppearanceRecipe => {
    const sortedIds = [robotAId, robotBId].sort();
    // seed = fusion_{uid}_{sortedA}_{sortedB}
    const seedString = `fusion_${uid}_${sortedIds[0]}_${sortedIds[1]}`;
    const rng = new SeededRandom(seedString);

    // Arms: Random
    const armsSource = rng.nextBool() ? 'A' : 'B';
    // Legs: Random
    const legsSource = rng.nextBool() ? 'A' : 'B';

    // Accessory: 45/45/10
    const accRoll = rng.next();
    let accessorySource: VariantSource | 'NONE' = 'NONE';
    if (accRoll < 0.45) accessorySource = 'A';
    else if (accRoll < 0.90) accessorySource = 'B';

    // Palette: A/B/HALF
    const palRoll = rng.nextInt(0, 2);
    const paletteMode = palRoll === 0 ? 'A' : palRoll === 1 ? 'B' : 'HALF';

    // Overlay
    const overlays = ["glitch", "golden", "shadow", "cyber", "rusty", "neon"];
    let overlayKey: string | undefined = undefined;
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

export const resolveVariantStats = (robotA: RobotData, robotB: RobotData): Partial<RobotData> => {
    return {
        baseHp: Math.floor((robotA.baseHp + robotB.baseHp) / 2),
        baseAttack: Math.floor((robotA.baseAttack + robotB.baseAttack) / 2),
        baseDefense: Math.floor((robotA.baseDefense + robotB.baseDefense) / 2),
        baseSpeed: Math.floor((robotA.baseSpeed + robotB.baseSpeed) / 2),
    };
};

const getPart = (source: VariantSource, partName: keyof RobotParts, partsA: RobotParts, partsB: RobotParts): number => {
    return source === 'A' ? partsA[partName] : partsB[partName];
};

export const resolveVariantAppearance = (recipe: AppearanceRecipe, robotA: RobotData, robotB: RobotData): { parts: RobotParts, colors: RobotColors } => {
    const pA = robotA.parts;
    const pB = robotB.parts;

    const parts: RobotParts = {
        head: pA.head,  // Fixed A
        face: pA.face,  // With Head
        body: pB.body,  // Fixed B
        backpack: pB.backpack, // With Body
        armLeft: getPart(recipe.armsSource, 'armLeft', pA, pB),
        armRight: getPart(recipe.armsSource, 'armRight', pA, pB),
        weapon: getPart(recipe.armsSource, 'weapon', pA, pB), // With Arms
        legLeft: getPart(recipe.legsSource, 'legLeft', pA, pB),
        legRight: getPart(recipe.legsSource, 'legRight', pA, pB),
        // Accessory
        accessory: recipe.accessorySource === 'NONE' ? 0 :
            (recipe.accessorySource === 'A' ? pA.accessory : pB.accessory),
    };

    let colors: RobotColors;
    if (recipe.paletteMode === 'A') {
        colors = { ...robotA.colors };
    } else if (recipe.paletteMode === 'B') {
        colors = { ...robotB.colors };
    } else {
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
