import { describe, it, expect } from 'vitest';
import { getTerrainFromBarcode, applyTerrainModifiers, getTerrainCritBonus, getTerrainSpeedModifier, getTerrainDefenseModifier } from './battleTerrain';

describe('Terrain Selection', () => {
    it('should be determin istic for same barcode', () => {
        const barcode = '4901427123456';
        expect(getTerrainFromBarcode(barcode)).toBe(getTerrainFromBarcode(barcode));
    });

    it('should select ICE for digits ending in 0, 3, 6, 9', () => {
        expect(getTerrainFromBarcode('1230')).toBe('ICE');
        expect(getTerrainFromBarcode('1233')).toBe('ICE');
        expect(getTerrainFromBarcode('1236')).toBe('ICE');
        expect(getTerrainFromBarcode('1239')).toBe('ICE');
    });

    it('should select VOLCANO for digits ending in 1, 4, 7', () => {
        expect(getTerrainFromBarcode('1231')).toBe('VOLCANO');
        expect(getTerrainFromBarcode('1234')).toBe('VOLCANO');
        expect(getTerrainFromBarcode('1237')).toBe('VOLCANO');
    });

    it('should select LIBRARY for digits ending in 2, 5, 8', () => {
        expect(getTerrainFromBarcode('1232')).toBe('LIBRARY');
        expect(getTerrainFromBarcode('1235')).toBe('LIBRARY');
        expect(getTerrainFromBarcode('1238')).toBe('LIBRARY');
    });

    it('should handle empty barcode', () => {
        expect(getTerrainFromBarcode('')).toBe('LIBRARY');
    });

    it('should handle non-numeric barcode', () => {
        expect(getTerrainFromBarcode('ABC')).toBe('LIBRARY');
    });
});

describe('Terrain Damage Modifiers', () => {
    it('ICE reduces damage by 5%', () => {
        expect(applyTerrainModifiers(100, 'ICE')).toBe(95);
        expect(applyTerrainModifiers(200, 'ICE')).toBe(190);
    });

    it('VOLCANO increases damage by 10%', () => {
        expect(applyTerrainModifiers(100, 'VOLCANO')).toBe(110);
        expect(applyTerrainModifiers(200, 'VOLCANO')).toBe(220);
    });

    it('LIBRARY has no damage modifier', () => {
        expect(applyTerrainModifiers(100, 'LIBRARY')).toBe(100);
        expect(applyTerrainModifiers(200, 'LIBRARY')).toBe(200);
    });

    it('should handle undefined terrain', () => {
        expect(applyTerrainModifiers(100, undefined)).toBe(100);
    });
});

describe('Terrain Stat Modifiers', () => {
    it('ICE provides +5% speed boost', () => {
        expect(getTerrainSpeedModifier('ICE')).toBe(1.05);
    });

    it('VOLCANO provides -5% defense penalty', () => {
        expect(getTerrainDefenseModifier('VOLCANO')).toBe(0.95);
    });

    it('LIBRARY provides +5% crit bonus', () => {
        expect(getTerrainCritBonus('LIBRARY')).toBe(0.05);
    });

    it('other terrains have no special modifiers', () => {
        expect(getTerrainSpeedModifier('VOLCANO')).toBe(1.0);
        expect(getTerrainSpeedModifier('LIBRARY')).toBe(1.0);
        expect(getTerrainDefenseModifier('ICE')).toBe(1.0);
        expect(getTerrainDefenseModifier('LIBRARY')).toBe(1.0);
        expect(getTerrainCritBonus('ICE')).toBe(0);
        expect(getTerrainCritBonus('VOLCANO')).toBe(0);
    });
});
