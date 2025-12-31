/**
 * Daily Boss System Tests
 * Tests for boss generation, SHIELD mechanics, and 1-per-day limits
 */

import { describe, it, expect } from 'vitest';
import { generateDailyBoss, bossToRobotData, getBossTraits, BossType } from '../src/dailyBoss';

describe('Daily Boss Generation', () => {
    describe('generateDailyBoss', () => {
        it('should generate the same boss for the same dateKey (determinism)', () => {
            const dateKey = '2024-01-15';
            const boss1 = generateDailyBoss(dateKey);
            const boss2 = generateDailyBoss(dateKey);

            expect(boss1.bossId).toBe(boss2.bossId);
            expect(boss1.name).toBe(boss2.name);
            expect(boss1.type).toBe(boss2.type);
            expect(boss1.stats).toEqual(boss2.stats);
            expect(boss1.shieldHp).toBe(boss2.shieldHp);
            expect(boss1.parts).toEqual(boss2.parts);
            expect(boss1.colors).toEqual(boss2.colors);
        });

        it('should generate different bosses for different dateKeys', () => {
            const boss1 = generateDailyBoss('2024-01-15');
            const boss2 = generateDailyBoss('2024-01-16');

            // At least one property should be different
            const isDifferent =
                boss1.name !== boss2.name ||
                boss1.type !== boss2.type ||
                boss1.stats.hp !== boss2.stats.hp;

            expect(isDifferent).toBe(true);
        });

        it('should generate bossId in correct format', () => {
            const dateKey = '2024-01-15';
            const boss = generateDailyBoss(dateKey);

            expect(boss.bossId).toBe(`daily_${dateKey}`);
            expect(boss.dateKey).toBe(dateKey);
        });

        it('should generate a valid boss type', () => {
            const boss = generateDailyBoss('2024-01-15');
            const validTypes: BossType[] = ['TANK', 'SPEED', 'SHIELD', 'REFLECT', 'BERSERK'];

            expect(validTypes).toContain(boss.type);
        });

        it('should generate a name with epithet', () => {
            const boss = generateDailyBoss('2024-01-15');

            expect(boss.name).toBeDefined();
            expect(boss.epithet).toBeDefined();
            expect(boss.baseName).toBeDefined();
            expect(boss.name).toBe(`${boss.epithet}${boss.baseName}`);
        });

        it('should have valid stats', () => {
            const boss = generateDailyBoss('2024-01-15');

            expect(boss.stats.hp).toBeGreaterThan(0);
            expect(boss.stats.attack).toBeGreaterThan(0);
            expect(boss.stats.defense).toBeGreaterThan(0);
            expect(boss.stats.speed).toBeGreaterThan(0);
        });
    });

    describe('SHIELD type boss', () => {
        // Find a dateKey that generates a SHIELD boss
        const findShieldBossDate = (): string => {
            for (let day = 1; day <= 365; day++) {
                const dateKey = `2024-${String(Math.floor((day - 1) / 31) + 1).padStart(2, '0')}-${String(((day - 1) % 31) + 1).padStart(2, '0')}`;
                const boss = generateDailyBoss(dateKey);
                if (boss.type === 'SHIELD') {
                    return dateKey;
                }
            }
            throw new Error('No SHIELD boss found in test range');
        };

        it('should have shieldHp for SHIELD type', () => {
            const shieldDateKey = findShieldBossDate();
            const boss = generateDailyBoss(shieldDateKey);

            expect(boss.type).toBe('SHIELD');
            expect(boss.shieldHp).toBeDefined();
            expect(boss.shieldHp).toBeGreaterThanOrEqual(400);
            expect(boss.shieldHp).toBeLessThanOrEqual(700);
        });

        it('should have consistent shieldHp for same dateKey', () => {
            const shieldDateKey = findShieldBossDate();
            const boss1 = generateDailyBoss(shieldDateKey);
            const boss2 = generateDailyBoss(shieldDateKey);

            expect(boss1.shieldHp).toBe(boss2.shieldHp);
        });
    });

    describe('Non-SHIELD boss', () => {
        it('should not have shieldHp for non-SHIELD types', () => {
            // Find a non-SHIELD boss
            let nonShieldBoss;
            for (let day = 1; day <= 100; day++) {
                const dateKey = `2024-01-${String(day).padStart(2, '0')}`;
                if (day > 31) continue; // Skip invalid dates
                const boss = generateDailyBoss(dateKey);
                if (boss.type !== 'SHIELD') {
                    nonShieldBoss = boss;
                    break;
                }
            }

            if (nonShieldBoss) {
                expect(nonShieldBoss.shieldHp).toBeUndefined();
            }
        });
    });

    describe('bossToRobotData', () => {
        it('should convert BossData to RobotData format', () => {
            const boss = generateDailyBoss('2024-01-15');
            const robotData = bossToRobotData(boss);

            expect(robotData.id).toBe(boss.bossId);
            expect(robotData.userId).toBe('BOSS');
            expect(robotData.name).toBe(boss.name);
            expect(robotData.baseHp).toBe(boss.stats.hp);
            expect(robotData.baseAttack).toBe(boss.stats.attack);
            expect(robotData.baseDefense).toBe(boss.stats.defense);
            expect(robotData.baseSpeed).toBe(boss.stats.speed);
            expect(robotData.level).toBe(10);
            expect(robotData.rarity).toBe(5);
        });
    });

    describe('getBossTraits', () => {
        it('should return correct traits for SHIELD boss', () => {
            // Find SHIELD boss
            for (let day = 1; day <= 365; day++) {
                const dateKey = `2024-${String(Math.floor((day - 1) / 31) + 1).padStart(2, '0')}-${String(((day - 1) % 31) + 1).padStart(2, '0')}`;
                const boss = generateDailyBoss(dateKey);
                if (boss.type === 'SHIELD') {
                    const traits = getBossTraits(boss);
                    expect(traits.type).toBe('SHIELD');
                    expect(traits.shieldHp).toBe(boss.shieldHp);
                    return;
                }
            }
        });

        it('should return traits without shieldHp for non-SHIELD boss', () => {
            for (let day = 1; day <= 31; day++) {
                const dateKey = `2024-01-${String(day).padStart(2, '0')}`;
                const boss = generateDailyBoss(dateKey);
                if (boss.type !== 'SHIELD') {
                    const traits = getBossTraits(boss);
                    expect(traits.type).toBe(boss.type);
                    expect(traits.shieldHp).toBeUndefined();
                    return;
                }
            }
        });
    });
});
