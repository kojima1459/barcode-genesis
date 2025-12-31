/**
 * Tests for Finisher and Sudden Death mechanics
 */

import { describe, it, expect } from 'vitest';
import { simulateBattle } from './battleSystem';
import { RobotData } from './types';

// Helper to create a test robot
const createTestRobot = (id: string, overrides: Partial<RobotData> = {}): RobotData => ({
    id,
    name: `Robot ${id}`,
    baseAttack: 50,
    baseDefense: 50,
    baseSpeed: 50,
    baseHp: 300,
    elementType: 1,
    skills: [],
    role: 'BALANCE',
    parts: {
        weapon: { id: 1, rarity: 'common' },
        backpack: { id: 1, rarity: 'common' },
        accessory: { id: 1, rarity: 'common' },
    },
    ...overrides,
});

describe('Finisher System', () => {
    it('should apply finisher deterministically with same seed', () => {
        const robot1 = createTestRobot('r1', { baseAttack: 100, baseHp: 500 });
        const robot2 = createTestRobot('r2', { baseAttack: 120, baseHp: 500 });

        // Run battle twice with same seed
        const result1 = simulateBattle(robot1, robot2, { battleId: 'test-finisher-seed-1' });
        const result2 = simulateBattle(robot1, robot2, { battleId: 'test-finisher-seed-1' });

        // Check if finisher was triggered in both
        const finisherLogs1 = result1.logs.filter(log => log.finisherApplied);
        const finisherLogs2 = result2.logs.filter(log => log.finisherApplied);

        // Should have same number of finisher activations
        expect(finisherLogs1.length).toBe(finisherLogs2.length);

        // If finisher activated, should happen at same turn
        if (finisherLogs1.length > 0) {
            expect(finisherLogs1.map(l => l.turn)).toEqual(finisherLogs2.map(l => l.turn));
            expect(finisherLogs1.map(l => l.attackerId)).toEqual(finisherLogs2.map(l => l.attackerId));
        }
    });

    it('should use finisher only once per side', () => {
        const robot1 = createTestRobot('r1', { baseAttack: 80, baseHp: 400 });
        const robot2 = createTestRobot('r2', { baseAttack: 90, baseHp: 400 });

        const result = simulateBattle(robot1, robot2, { battleId: 'test-finisher-once' });

        const p1Finishers = result.logs.filter(log => log.finisherApplied && log.attackerId === robot1.id);
        const p2Finishers = result.logs.filter(log => log.finisherApplied && log.attackerId === robot2.id);

        // Each side should use finisher at most once
        expect(p1Finishers.length).toBeLessThanOrEqual(1);
        expect(p2Finishers.length).toBeLessThanOrEqual(1);
    });

    it('should apply correct multiplier when finisher triggers', () => {
        const robot1 = createTestRobot('r1', { baseAttack: 100, baseHp: 400 });
        const robot2 = createTestRobot('r2', { baseAttack: 120, baseHp: 400 });

        const result = simulateBattle(robot1, robot2, { battleId: 'test-finisher-multiplier' });

        const finisherLogs = result.logs.filter(log => log.finisherApplied);

        finisherLogs.forEach(log => {
            expect(log.finisherMultiplier).toBe(1.35);
            expect(log.message).toContain('必殺の一撃');
        });
    });
});

describe('Sudden Death System', () => {
    it('should trigger sudden death after turn 20', () => {
        // Create balanced robots that will last long
        const robot1 = createTestRobot('r1', { baseAttack: 30, baseDefense: 100, baseHp: 1000 });
        const robot2 = createTestRobot('r2', { baseAttack: 30, baseDefense: 100, baseHp: 1000 });

        const result = simulateBattle(robot1, robot2, { battleId: 'test-sudden-death' });

        const suddenDeathLogs = result.logs.filter(log => log.suddenDeathTick);

        // If battle lasted > 20 turns, should have sudden death ticks
        const maxTurn = Math.max(...result.logs.map(l => l.turn));
        if (maxTurn > 20) {
            expect(suddenDeathLogs.length).toBeGreaterThan(0);

            // All sudden death logs should be after turn 20
            suddenDeathLogs.forEach(log => {
                expect(log.turn).toBeGreaterThan(20);
                expect(log.action).toBe('SUDDEN_DEATH');
                expect(log.message).toContain('環境が崩壊');
            });
        }
    });

    it('should apply environmental damage deterministically', () => {
        const robot1 = createTestRobot('r1', { baseAttack: 30, baseDefense: 100, baseHp: 1000 });
        const robot2 = createTestRobot('r2', { baseAttack: 30, baseDefense: 100, baseHp: 1000 });

        // Run same battle twice
        const result1 = simulateBattle(robot1, robot2, { battleId: 'test-sd-determinism' });
        const result2 = simulateBattle(robot1, robot2, { battleId: 'test-sd-determinism' });

        const sdLogs1 = result1.logs.filter(log => log.suddenDeathTick);
        const sdLogs2 = result2.logs.filter(log => log.suddenDeathTick);

        // Same number of sudden death ticks
        expect(sdLogs1.length).toBe(sdLogs2.length);

        // Same turns
        if (sdLogs1.length > 0) {
            expect(sdLogs1.map(l => l.turn)).toEqual(sdLogs2.map(l => l.turn));
            expect(sdLogs1.map(l => l.attackerHp)).toEqual(sdLogs2.map(l => l.attackerHp));
            expect(sdLogs1.map(l => l.defenderHp)).toEqual(sdLogs2.map(l => l.defenderHp));
        }
    });

    it('should deal 3% max HP damage per tick', () => {
        const robot1 = createTestRobot('r1', { baseAttack: 30, baseDefense: 100, baseHp: 1000 });
        const robot2 = createTestRobot('r2', { baseAttack: 30, baseDefense: 100, baseHp: 1000 });

        const result = simulateBattle(robot1, robot2, { battleId: 'test-sd-damage' });

        const suddenDeathLogs = result.logs.filter(log => log.suddenDeathTick);

        if (suddenDeathLogs.length > 0) {
            // Check that damage is approximately 3% of max HP
            const expectedDamage = Math.floor(1000 * 0.03); // 30
            suddenDeathLogs.forEach(log => {
                expect(log.suddenDeathDamage).toBe(expectedDamage);
            });
        }
    });
});

describe('Combined Mechanics', () => {
    it('should not alter RNG consumption order', () => {
        const robot1 = createTestRobot('r1', { baseAttack: 100, baseHp: 500 });
        const robot2 = createTestRobot('r2', { baseAttack: 110, baseHp: 500 });

        // Same seed should produce identical results
        const result1 = simulateBattle(robot1, robot2, { battleId: 'test-rng-consistency-1' });
        const result2 = simulateBattle(robot1, robot2, { battleId: 'test-rng-consistency-1' });

        // All logs should be identical
        expect(result1.logs.length).toBe(result2.logs.length);

        for (let i = 0; i < result1.logs.length; i++) {
            const log1 = result1.logs[i];
            const log2 = result2.logs[i];

            expect(log1.turn).toBe(log2.turn);
            expect(log1.damage).toBe(log2.damage);
            expect(log1.isCritical).toBe(log2.isCritical);
            expect(log1.attackerHp).toBe(log2.attackerHp);
            expect(log1.defenderHp).toBe(log2.defenderHp);
        }

        // Winner should be the same
        expect(result1.winnerId).toBe(result2.winnerId);
    });
});
