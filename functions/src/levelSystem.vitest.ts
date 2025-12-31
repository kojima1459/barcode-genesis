import { describe, it, expect } from 'vitest';
import { applyUserXp, calculateNextLevelXp, getWorkshopLines, calculateEffectiveStats, applyRobotXp, LEVEL_CAP } from './levelSystem';

describe('Level System Logic', () => {
    it('should calculate next level xp correctly', () => {
        // Lv1: 20 * 1 = 20
        expect(calculateNextLevelXp(1)).toBe(20);
        // Lv2: 20 * 3.03 = 61 (2^1.6 = 3.031...)
        // 20*3.031 = 60.6 -> 61
        expect(calculateNextLevelXp(2)).toBe(61);
    });

    it('should calculate workshop lines correctly', () => {
        expect(getWorkshopLines(1)).toBe(1);
        expect(getWorkshopLines(4)).toBe(1);
        expect(getWorkshopLines(5)).toBe(2);
        expect(getWorkshopLines(10)).toBe(3);
        expect(getWorkshopLines(30)).toBe(7);
    });

    it('should handle user xp gain without level up', () => {
        const res = applyUserXp(1, 0, 10);
        expect(res.newLevel).toBe(1);
        expect(res.newXp).toBe(10);
        expect(res.leveledUp).toBe(false);
    });

    it('should handle robot xp gain', () => {
        // Robot XP curve is same as user XP curve
        // Lv1 req 20. Gain 25 -> Lv2 (5XP overflow)
        const res = applyRobotXp(1, 0, 25);
        expect(res.newLevel).toBe(2);
        expect(res.newXp).toBe(5);
        expect(res.leveledUp).toBe(true);
    });

    it('should cap robot level at LEVEL_CAP (30)', () => {
        const res = applyRobotXp(LEVEL_CAP - 1, 0, 1000000);
        expect(res.newLevel).toBe(LEVEL_CAP);
        expect(res.newXp).toBeGreaterThan(0);
    });
});

describe('Effective Stats Calculation', () => {
    // Formula:
    // HP: base + floor(level * 1.0)
    // ATK: base + floor(level * 0.3)
    // DEF: base + floor(level * 0.3)
    // SPD: base + floor(level * 0.3)

    it('calculates stats at level 1', () => {
        const base = { hp: 100, attack: 10, defense: 10, speed: 10, isPlayer: true };
        const stats = calculateEffectiveStats(base, 1);
        // HP: 100 + floor(1*1) = 101
        // ATK: 10 + floor(1*0.3) = 10
        // DEF: 10 + floor(1*0.3) = 10
        // SPD: 10 + floor(1*0.3) = 10
        expect(stats.hp).toBe(101);
        expect(stats.attack).toBe(10);
        expect(stats.defense).toBe(10);
        expect(stats.speed).toBe(10);
    });

    it('calculates stats at level 10', () => {
        const base = { hp: 100, attack: 10, defense: 10, speed: 10, isPlayer: true };
        const stats = calculateEffectiveStats(base, 10);
        // HP: 100 + 10 = 110
        // ATK: 10 + 3 = 13
        // DEF: 10 + 3 = 13
        // SPD: 10 + 3 = 13
        expect(stats.hp).toBe(110);
        expect(stats.attack).toBe(13);
        expect(stats.defense).toBe(13);
        expect(stats.speed).toBe(13);
    });

    it('calculates stats at level 30 (max)', () => {
        const base = { hp: 200, attack: 50, defense: 50, speed: 50, isPlayer: true };
        const stats = calculateEffectiveStats(base, 30);
        // HP: 200 + 30 = 230
        // ATK: 50 + 9 = 59
        // DEF: 50 + 9 = 59
        // SPD: 50 + 9 = 59
        expect(stats.hp).toBe(230);
        expect(stats.attack).toBe(59);
        expect(stats.defense).toBe(59);
        expect(stats.speed).toBe(59);
    });

    it('is deterministic', () => {
        const base = { hp: 100, attack: 20, defense: 20, speed: 20, isPlayer: true };
        const s1 = calculateEffectiveStats(base, 15);
        const s2 = calculateEffectiveStats(base, 15);
        expect(s1).toEqual(s2);
    });
});
