import { describe, it, expect } from 'vitest';
import { applyUserXp, calculateNextLevelXp, getWorkshopLines, LEVEL_CAP, getLevelMultiplier, STAT_MULTIPLIER_CAP } from './levelSystem';

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
        expect(getWorkshopLines(15)).toBe(4);
        expect(getWorkshopLines(20)).toBe(5);
        expect(getWorkshopLines(25)).toBe(6);
        expect(getWorkshopLines(29)).toBe(6);
        expect(getWorkshopLines(30)).toBe(7);
    });

    it('should handle xp gain without level up', () => {
        // Lv1 (0 XP) + 10 XP -> Lv1, 10 XP
        const res = applyUserXp(1, 0, 10);
        expect(res.newLevel).toBe(1);
        expect(res.newXp).toBe(10);
        expect(res.leveledUp).toBe(false);
    });

    it('should handle level up exactly', () => {
        // Lv1 (0 XP) + 20 XP -> Lv2, 0 XP
        const res = applyUserXp(1, 0, 20);
        expect(res.newLevel).toBe(2);
        expect(res.newXp).toBe(0);
        expect(res.leveledUp).toBe(true);
    });

    it('should handle level up with overflow', () => {
        // Lv1 (0 XP) + 25 XP -> Lv2, 5 XP
        // Lv1 req 20.
        const res = applyUserXp(1, 0, 25);
        expect(res.newLevel).toBe(2);
        expect(res.newXp).toBe(5);
        expect(res.leveledUp).toBe(true);
    });

    it('should handle multi-level up', () => {
        // Lv1 req 20. Lv2 req 61. Total 81.
        // Gain 100 XP.
        // 100 - 20 = 80. (Lv2)
        // 80 - 61 = 19. (Lv3)
        const res = applyUserXp(1, 0, 100);
        expect(res.newLevel).toBe(3);
        expect(res.newXp).toBe(19);
        expect(res.leveledUp).toBe(true);
        expect(res.workshopLines).toBe(1); // Lv3 is still 1 line (Lv5 needs 2)
    });

    it('should update workshop lines at threshold', () => {
        // Lv4 -> Lv5
        // Lv4 req = 20 * 4^1.6 = 20 * 9.189 = 183.7 -> 184
        const req = calculateNextLevelXp(4);
        const res = applyUserXp(4, 0, req); // Exact
        expect(res.newLevel).toBe(5);
        expect(res.workshopLines).toBe(2);
    });

    it('should cap at Level 30', () => {
        const res = applyUserXp(29, 0, 100000); // Huge XP
        expect(res.newLevel).toBe(30);
        expect(res.workshopLines).toBe(7);
        // XP should be large (accumulate beyond cap)
        // 100000 - req(29) ...
        expect(res.newXp).toBeGreaterThan(0);
    });

    it('should not go beyond Level 30', () => {
        const res = applyUserXp(30, 0, 100);
        expect(res.newLevel).toBe(30);
        expect(res.newXp).toBe(100);
    });
});

describe('Level Stat Multiplier', () => {
    it('returns 1.0 at level 1', () => {
        expect(getLevelMultiplier(1)).toBe(1.0);
    });

    it('returns correct value at level 5 (tier 1)', () => {
        // Tier 1: +2% per level for levels 2-5 (4 steps)
        // 1 + 0.02 * 4 = 1.08
        expect(getLevelMultiplier(5)).toBeCloseTo(1.08, 2);
    });

    it('returns correct value at level 10 (tier 2)', () => {
        // Tier 1: +8% for levels 2-5
        // Tier 2: +1% per level for levels 6-10 (5 steps = +5%)
        // Total: 1 + 0.08 + 0.05 = 1.13
        expect(getLevelMultiplier(10)).toBeCloseTo(1.13, 2);
    });

    it('returns correct value at level 20 (tier 3)', () => {
        // Tier 1: +8%
        // Tier 2: +5%
        // Tier 3: +0.5% per level for levels 11-20 (10 steps = +5%)
        // Total: 1 + 0.08 + 0.05 + 0.05 = 1.18
        expect(getLevelMultiplier(20)).toBeCloseTo(1.18, 2);
    });

    it('returns correct value at level 30', () => {
        // Tier 1: +8%, Tier 2: +5%, Tier 3: (20 steps) = +10%
        // Total: 1 + 0.08 + 0.05 + 0.10 = 1.23
        expect(getLevelMultiplier(30)).toBeCloseTo(1.23, 2);
    });

    it('caps at STAT_MULTIPLIER_CAP (1.30)', () => {
        // At level 100, uncapped would be: 1 + 0.08 + 0.05 + 0.45 = 1.58
        // Should cap at 1.30
        expect(getLevelMultiplier(100)).toBe(STAT_MULTIPLIER_CAP);
        expect(getLevelMultiplier(100)).toBe(1.30);
    });

    it('handles edge cases (null, 0, negative)', () => {
        expect(getLevelMultiplier(0)).toBe(1.0);
        expect(getLevelMultiplier(-1)).toBe(1.0);
        // @ts-expect-error testing undefined
        expect(getLevelMultiplier(undefined)).toBe(1.0);
    });

    it('is deterministic', () => {
        // Same level always returns same multiplier
        expect(getLevelMultiplier(15)).toBe(getLevelMultiplier(15));
        expect(getLevelMultiplier(25)).toBe(getLevelMultiplier(25));
    });
});

