/**
 * BattleSystem Vitest Integration Tests
 * - Seed determinism  
 * - Cheer application verification
 * - HP transition integrity
 */

import { describe, it, expect } from 'vitest';
import { simulateBattle, CheerInput } from './battleSystem';
import { RobotData, BattleLog, BattleResult } from './types';

// Helper: Create test robot
const createTestRobot = (id: string, overrides: Partial<RobotData> = {}): RobotData => ({
    id,
    userId: 'test-user',
    name: `Robot ${id}`,
    sourceBarcode: '4901234567890',
    rarity: 3,
    rarityName: 'Rare',
    baseHp: 100,
    baseAttack: 20,
    baseDefense: 10,
    baseSpeed: 15,
    elementType: 1,
    elementName: 'Fire',
    parts: {
        head: 5, face: 5, body: 5, armLeft: 5, armRight: 5,
        legLeft: 5, legRight: 5, backpack: 5, weapon: 5, accessory: 5,
    },
    colors: {
        primary: '#FF0000', secondary: '#00FF00',
        accent: '#0000FF', glow: '#FFFFFF',
    },
    totalBattles: 0,
    totalWins: 0,
    isFavorite: false,
    ...overrides,
});

describe('simulateBattle: Seed Determinism', () => {
    it('should produce identical results for same battleId', () => {
        const robot1 = createTestRobot('robot-1');
        const robot2 = createTestRobot('robot-2', { baseSpeed: 12 });
        const battleId = 'determinism-test-fixed';

        const results: BattleResult[] = [];
        for (let i = 0; i < 10; i++) {
            results.push(simulateBattle(robot1, robot2, battleId));
        }

        // All results should be identical
        for (let i = 1; i < results.length; i++) {
            expect(results[i].winnerId).toBe(results[0].winnerId);
            expect(results[i].loserId).toBe(results[0].loserId);
            expect(results[i].logs.length).toBe(results[0].logs.length);

            // Deep check: every log should match
            for (let j = 0; j < results[i].logs.length; j++) {
                expect(results[i].logs[j].damage).toBe(results[0].logs[j].damage);
                expect(results[i].logs[j].attackerHp).toBe(results[0].logs[j].attackerHp);
                expect(results[i].logs[j].defenderHp).toBe(results[0].logs[j].defenderHp);
            }
        }
    });

    it('should produce identical results with same cheer input', () => {
        const robot1 = createTestRobot('robot-1');
        const robot2 = createTestRobot('robot-2');
        const battleId = 'cheer-determinism-test';
        const cheer: CheerInput = { p1: true, p2: false };

        const result1 = simulateBattle(robot1, robot2, battleId, [], cheer);
        const result2 = simulateBattle(robot1, robot2, battleId, [], cheer);

        expect(result1.winnerId).toBe(result2.winnerId);
        expect(result1.logs.length).toBe(result2.logs.length);
        expect(JSON.stringify(result1.logs)).toBe(JSON.stringify(result2.logs));
    });
});

describe('simulateBattle: Cheer Application', () => {
    it('should apply cheerApplied exactly once for P1 when p1 cheer is true', () => {
        const robot1 = createTestRobot('robot-1');
        const robot2 = createTestRobot('robot-2');
        const battleId = 'cheer-p1-test';

        const result = simulateBattle(robot1, robot2, battleId, [], { p1: true, p2: false });

        const cheerAppliedLogs = result.logs.filter(log => log.cheerApplied);
        expect(cheerAppliedLogs.length).toBe(1);
        expect(cheerAppliedLogs[0].cheerSide).toBe('P1');
        expect(cheerAppliedLogs[0].attackerId).toBe('robot-1');
    });

    it('should apply cheerApplied exactly once for P2 when p2 cheer is true', () => {
        const robot1 = createTestRobot('robot-1');
        const robot2 = createTestRobot('robot-2');
        const battleId = 'cheer-p2-test';

        const result = simulateBattle(robot1, robot2, battleId, [], { p1: false, p2: true });

        const cheerAppliedLogs = result.logs.filter(log => log.cheerApplied);
        expect(cheerAppliedLogs.length).toBe(1);
        expect(cheerAppliedLogs[0].cheerSide).toBe('P2');
        expect(cheerAppliedLogs[0].attackerId).toBe('robot-2');
    });

    it('should apply cheerApplied twice when both p1 and p2 cheer are true', () => {
        const robot1 = createTestRobot('robot-1');
        const robot2 = createTestRobot('robot-2');
        const battleId = 'cheer-both-test';

        const result = simulateBattle(robot1, robot2, battleId, [], { p1: true, p2: true });

        const cheerAppliedLogs = result.logs.filter(log => log.cheerApplied);
        expect(cheerAppliedLogs.length).toBe(2);
        expect(cheerAppliedLogs.some(l => l.cheerSide === 'P1')).toBe(true);
        expect(cheerAppliedLogs.some(l => l.cheerSide === 'P2')).toBe(true);
    });

    it('should not apply cheer when no cheer input', () => {
        const robot1 = createTestRobot('robot-1');
        const robot2 = createTestRobot('robot-2');
        const battleId = 'no-cheer-test';

        const result = simulateBattle(robot1, robot2, battleId);

        const cheerAppliedLogs = result.logs.filter(log => log.cheerApplied);
        expect(cheerAppliedLogs.length).toBe(0);
    });
});

describe('simulateBattle: Cheer Damage Multiplier', () => {
    it('should apply 1.2x damage for cheered attack', () => {
        const robot1 = createTestRobot('robot-1');
        const robot2 = createTestRobot('robot-2');
        const battleId = 'cheer-damage-test';

        // Run without cheer first
        const resultNoCheer = simulateBattle(robot1, robot2, battleId, [], undefined);

        // Run with P1 cheer
        const resultWithCheer = simulateBattle(robot1, robot2, battleId, [], { p1: true, p2: false });

        // Find the turn where cheer was applied
        const cheerLog = resultWithCheer.logs.find(log => log.cheerApplied && log.cheerSide === 'P1');
        expect(cheerLog).toBeDefined();

        // Find the corresponding turn in no-cheer result
        const noCheerLog = resultNoCheer.logs.find(log =>
            log.turn === cheerLog!.turn && log.attackerId === cheerLog!.attackerId
        );
        expect(noCheerLog).toBeDefined();

        // Verify 1.2x multiplier (allow for floor rounding)
        const expectedDamage = Math.floor(noCheerLog!.damage * 1.2);
        expect(cheerLog!.damage).toBe(expectedDamage);
        expect(cheerLog!.cheerMultiplier).toBe(1.2);
    });
});

describe('simulateBattle: HP Transition Integrity', () => {
    it('should have consistent HP values based on damage', () => {
        const robot1 = createTestRobot('robot-1', { baseHp: 150 });
        const robot2 = createTestRobot('robot-2', { baseHp: 120 });
        const battleId = 'hp-integrity-test';

        const result = simulateBattle(robot1, robot2, battleId, [], { p1: true, p2: true });

        let hp1 = 150;
        let hp2 = 120;

        for (const log of result.logs) {
            if (log.damage > 0 && log.action !== 'heal') {
                // Attacker deals damage to defender
                if (log.attackerId === 'robot-1') {
                    hp2 -= log.damage;
                    expect(log.defenderHp).toBe(Math.max(0, hp2));
                } else {
                    hp1 -= log.damage;
                    expect(log.defenderHp).toBe(Math.max(0, hp1));
                }
            }
        }
    });
});

// TODO: Future test - verify cheer can change battle outcome in close matchups
// Skipped for now to avoid flaky tests. Could be implemented by finding a fixed
// battleId where cheer swings the result.
