
import { describe, it, expect } from 'vitest';
import { generateVariantRecipe, resolveVariantStats, resolveVariantAppearance } from './variantSystem';
import { RobotData } from './types';

const mockRobot = (id: string, partsMod: number): RobotData => ({
    id, userId: 'u1', name: 'Mock', sourceBarcode: '111',
    rarity: 1, rarityName: 'Common', elementType: 1, elementName: 'Fire',
    baseHp: 100 * partsMod, baseAttack: 20 * partsMod, baseDefense: 20 * partsMod, baseSpeed: 20 * partsMod,
    totalBattles: 0, totalWins: 0, isFavorite: false,
    parts: {
        head: 1 * partsMod, face: 1 * partsMod, body: 1 * partsMod,
        armLeft: 1 * partsMod, armRight: 1 * partsMod,
        legLeft: 1 * partsMod, legRight: 1 * partsMod,
        backpack: 1 * partsMod, weapon: 1 * partsMod, accessory: 1 * partsMod
    },
    colors: { primary: '#000', secondary: '#111', accent: '#222', glow: '#333' }
});

describe('Variant System', () => {
    it('should generate deterministic recipe from swapped inputs', () => {
        const uid = 'user_test';
        const rA = 'robot_100';
        const rB = 'robot_200';

        const recipe1 = generateVariantRecipe(uid, rA, rB);
        const recipe2 = generateVariantRecipe(uid, rB, rA);

        expect(recipe1).toEqual(recipe2);
        expect(recipe1.headSource).toBe('A');
        expect(recipe1.bodySource).toBe('B');
    });

    it('should resolve stats average correctly', () => {
        const r1 = mockRobot('r1', 1); // 100, 20...
        const r2 = mockRobot('r2', 2); // 200, 40...

        const stats = resolveVariantStats(r1, r2);
        expect(stats.baseHp).toBe(150);
        expect(stats.baseAttack).toBe(30);
        expect(stats.baseDefense).toBe(30);
        expect(stats.baseSpeed).toBe(30);
    });

    it('should mix parts based on recipe', () => {
        const r1 = mockRobot('r1', 1); // Parts = 1
        const r2 = mockRobot('r2', 2); // Parts = 2

        // Mock recipe: Arms A (1), Legs B (2), Accessory A (1)
        const recipe: any = {
            headSource: 'A', bodySource: 'B',
            armsSource: 'A', legsSource: 'B', accessorySource: 'A',
            paletteMode: 'A'
        };

        const result = resolveVariantAppearance(recipe, r1, r2);

        expect(result.parts.head).toBe(1); // A
        expect(result.parts.body).toBe(2); // B
        expect(result.parts.armLeft).toBe(1); // A
        expect(result.parts.legLeft).toBe(2); // B
        expect(result.parts.accessory).toBe(1); // A
        expect(result.colors.primary).toBe('#000'); // A
    });
});
