/**
 * Terrain System for Battle Engine (Client)
 * Deterministic terrain selection from barcodes with battle modifiers
 */

export type Terrain = 'ICE' | 'VOLCANO' | 'LIBRARY';

/**
 * Deterministically select terrain from barcode
 * Rule: Last digit mod 3
 * - 0, 3, 6, 9 → ICE
 * - 1, 4, 7 → VOLCANO
 * - 2, 5, 8 → LIBRARY
 */
export function getTerrainFromBarcode(barcode: string): Terrain {
    if (!barcode || barcode.length === 0) {
        return 'LIBRARY'; // Default fallback
    }

    const lastDigit = parseInt(barcode[barcode.length - 1], 10);
    if (isNaN(lastDigit)) {
        return 'LIBRARY'; // Fallback for non-numeric
    }

    const mod = lastDigit % 3;
    if (mod === 0) return 'ICE';
    if (mod === 1) return 'VOLCANO';
    return 'LIBRARY';
}

/**
 * Apply terrain damage modifiers
 * - ICE: -5% damage (slower, defensive)
 * - VOLCANO: +10% damage (aggressive)
 * - LIBRARY: No damage modifier
 */
export function applyTerrainModifiers(
    baseDamage: number,
    terrain: Terrain | undefined
): number {
    if (!terrain) return baseDamage;

    switch (terrain) {
        case 'ICE':
            return Math.floor(baseDamage * 0.95);
        case 'VOLCANO':
            return Math.floor(baseDamage * 1.10);
        case 'LIBRARY':
            return baseDamage;
        default:
            return baseDamage;
    }
}

/**
 * Get critical hit bonus from terrain
 * - LIBRARY: +5% crit rate
 */
export function getTerrainCritBonus(terrain: Terrain | undefined): number {
    return terrain === 'LIBRARY' ? 0.05 : 0;
}

/**
 * Get speed modifier from terrain
 * - ICE: +5% speed
 */
export function getTerrainSpeedModifier(terrain: Terrain | undefined): number {
    return terrain === 'ICE' ? 1.05 : 1.0;
}

/**
 * Get defense modifier from terrain
 * - VOLCANO: -5% defense
 */
export function getTerrainDefenseModifier(terrain: Terrain | undefined): number {
    return terrain === 'VOLCANO' ? 0.95 : 1.0;
}
