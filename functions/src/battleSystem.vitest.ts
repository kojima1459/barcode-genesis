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

// ============================================
// Pre-Battle Item Tests
// ============================================

import { BattleItemInput } from './types';

describe('simulateBattle: Pre-Battle Item Determinism', () => {
    it('should produce identical results with same battleItems input', () => {
        const robot1 = createTestRobot('robot-1');
        const robot2 = createTestRobot('robot-2');
        const battleId = 'item-determinism-test';
        const battleItems: BattleItemInput = { p1: 'BOOST', p2: null };

        const result1 = simulateBattle(robot1, robot2, battleId, [], undefined, battleItems);
        const result2 = simulateBattle(robot1, robot2, battleId, [], undefined, battleItems);

        expect(result1.winnerId).toBe(result2.winnerId);
        expect(result1.logs.length).toBe(result2.logs.length);
        expect(JSON.stringify(result1.logs)).toBe(JSON.stringify(result2.logs));
    });

    it('should produce identical results with SHIELD item', () => {
        const robot1 = createTestRobot('robot-1');
        const robot2 = createTestRobot('robot-2');
        const battleId = 'shield-determinism-test';
        const battleItems: BattleItemInput = { p1: 'SHIELD', p2: null };

        const result1 = simulateBattle(robot1, robot2, battleId, [], undefined, battleItems);
        const result2 = simulateBattle(robot1, robot2, battleId, [], undefined, battleItems);

        expect(JSON.stringify(result1.logs)).toBe(JSON.stringify(result2.logs));
    });
});

describe('simulateBattle: BOOST Item Application', () => {
    it('should apply BOOST exactly once for P1 when P1 has BOOST', () => {
        const robot1 = createTestRobot('robot-1');
        const robot2 = createTestRobot('robot-2');
        const battleId = 'boost-p1-test';
        const battleItems: BattleItemInput = { p1: 'BOOST', p2: null };

        const result = simulateBattle(robot1, robot2, battleId, [], undefined, battleItems);

        const boostLogs = result.logs.filter(log => log.itemApplied && log.itemType === 'BOOST');
        expect(boostLogs.length).toBe(1);
        expect(boostLogs[0].itemSide).toBe('P1');
        expect(boostLogs[0].itemEffect).toBe('×1.15');
    });

    it('should apply 1.15x damage for BOOST attack', () => {
        const robot1 = createTestRobot('robot-1');
        const robot2 = createTestRobot('robot-2');
        const battleId = 'boost-damage-test';

        // Run without item first
        const resultNoItem = simulateBattle(robot1, robot2, battleId, [], undefined, undefined);

        // Run with P1 BOOST
        const resultWithItem = simulateBattle(robot1, robot2, battleId, [], undefined, { p1: 'BOOST', p2: null });

        // Find the turn where boost was applied
        const boostLog = resultWithItem.logs.find(log => log.itemApplied && log.itemType === 'BOOST');
        expect(boostLog).toBeDefined();

        // Find the corresponding turn in no-item result
        const noItemLog = resultNoItem.logs.find(log =>
            log.turn === boostLog!.turn && log.attackerId === boostLog!.attackerId
        );
        expect(noItemLog).toBeDefined();

        // Verify 1.15x multiplier (allow for floor rounding)
        const expectedDamage = Math.floor(noItemLog!.damage * 1.15);
        expect(boostLog!.damage).toBe(expectedDamage);
    });
});

describe('simulateBattle: SHIELD Item Application', () => {
    it('should apply SHIELD exactly once for P1 when P1 has SHIELD', () => {
        const robot1 = createTestRobot('robot-1', { baseSpeed: 5 }); // P1 is slower, so P2 attacks first
        const robot2 = createTestRobot('robot-2', { baseSpeed: 20 });
        const battleId = 'shield-p1-test';
        const battleItems: BattleItemInput = { p1: 'SHIELD', p2: null };

        const result = simulateBattle(robot1, robot2, battleId, [], undefined, battleItems);

        const shieldLogs = result.logs.filter(log => log.itemApplied && log.itemType === 'SHIELD');
        expect(shieldLogs.length).toBe(1);
        expect(shieldLogs[0].itemSide).toBe('P1');
        expect(shieldLogs[0].itemEffect).toBe('×0.85');
    });
});

describe('simulateBattle: Item + Cheer Stacking', () => {
    it('should apply both cheer and boost when both are active', () => {
        const robot1 = createTestRobot('robot-1');
        const robot2 = createTestRobot('robot-2');
        const battleId = 'cheer-boost-stack-test';

        // Run with both cheer and boost
        const result = simulateBattle(
            robot1, robot2, battleId, [],
            { p1: true, p2: false },  // P1 has cheer
            { p1: 'BOOST', p2: null }  // P1 has boost
        );

        // Both should be applied on P1's first attack
        const p1FirstAttack = result.logs.find(log =>
            log.attackerId === 'robot-1' && log.damage > 0
        );
        expect(p1FirstAttack).toBeDefined();

        // Check if cheer was applied
        expect(p1FirstAttack!.cheerApplied).toBe(true);
        // Check if boost was applied
        expect(p1FirstAttack!.itemApplied).toBe(true);
        expect(p1FirstAttack!.itemType).toBe('BOOST');
    });

    it('should stack cheer (1.2x) and boost (1.15x) correctly', () => {
        const robot1 = createTestRobot('robot-1');
        const robot2 = createTestRobot('robot-2');
        const battleId = 'stack-multiplier-test';

        // Baseline (no cheer, no item)
        const baseline = simulateBattle(robot1, robot2, battleId, [], undefined, undefined);
        const baselineDmg = baseline.logs.find(l => l.attackerId === 'robot-1' && l.damage > 0)!.damage;

        // Cheer only
        const cheerOnly = simulateBattle(robot1, robot2, battleId, [], { p1: true, p2: false }, undefined);
        const cheerDmg = cheerOnly.logs.find(l => l.attackerId === 'robot-1' && l.cheerApplied)!.damage;
        expect(cheerDmg).toBe(Math.floor(baselineDmg * 1.2));

        // Both cheer and boost
        const both = simulateBattle(robot1, robot2, battleId, [], { p1: true, p2: false }, { p1: 'BOOST', p2: null });
        const bothLog = both.logs.find(l => l.attackerId === 'robot-1' && l.cheerApplied && l.itemApplied);
        expect(bothLog).toBeDefined();
        // floor(floor(base * 1.2) * 1.15)
        const expectedBothDmg = Math.floor(Math.floor(baselineDmg * 1.2) * 1.15);
        expect(bothLog!.damage).toBe(expectedBothDmg);
    });
});

describe('simulateBattle v2 Updates', () => {
    it('should respect MAX_TURNS = 20', () => {
        const r1 = createTestRobot('r1', { baseHp: 5000, baseAttack: 20, baseDefense: 20 });
        const r2 = createTestRobot('r2', { baseHp: 5000, baseAttack: 20, baseDefense: 20 });
        const res = simulateBattle(r1, r2, 'turn-limit-test');
        // Likely to reach turn 20 with high HP
        if (res.logs[res.logs.length - 1].defenderHp > 0) {
            expect(res.turnCount).toBe(20);
        }
    });

    it('should produce damage within new formula range', () => {
        const r1 = createTestRobot('atker', { baseAttack: 20, baseDefense: 10 });
        const r2 = createTestRobot('defer', { baseAttack: 20, baseDefense: 10 });
        // Base = 400/30 = 13.
        // Variance 0.9-1.1 -> Range 11 to 14.
        const res = simulateBattle(r1, r2, 'dmg-test-v2');
        const firstHit = res.logs.find(l => l.damage > 0 && !l.isCritical && !l.itemApplied && !l.cheerApplied);
        if (firstHit) {
            expect(firstHit.damage).toBeGreaterThanOrEqual(11);
            expect(firstHit.damage).toBeLessThanOrEqual(14);
        }
    });
});
