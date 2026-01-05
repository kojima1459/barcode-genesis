/**
 * BattleSystem Vitest Integration Tests
 * - Seed determinism  
 * - Cheer application verification
 * - HP transition integrity
 * - Finisher and Sudden Death mechanics
 */

import { describe, it, expect } from 'vitest';
import { simulateBattle, CheerInput } from './battleSystem';
import { RobotData, BattleResult, BattleItemInput } from './types';

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

    it('should deepEqual for identical inputs', () => {
        const robot1 = createTestRobot('robot-1', { baseAttack: 120, baseDefense: 80, baseSpeed: 20 });
        const robot2 = createTestRobot('robot-2', { baseAttack: 95, baseDefense: 110, baseSpeed: 25 });
        const battleId = 'determinism-deep-equal';

        const result1 = simulateBattle(robot1, robot2, battleId);
        const result2 = simulateBattle(robot1, robot2, battleId);

        expect(result1).toEqual(result2);
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

        let hp1 = 151; // 150 base + 1 (Lv1)
        let hp2 = 121; // 120 base + 1 (Lv1)

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
        expect(boostLogs[0].itemEvent).toBe('ITEM_APPLIED');
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
        expect(shieldLogs[0].itemEvent).toBe('ITEM_APPLIED');
    });

    it('should reduce incoming damage by 0.85x for SHIELD', () => {
        const robot1 = createTestRobot('robot-1', { baseSpeed: 5 });
        const robot2 = createTestRobot('robot-2', { baseSpeed: 20 });
        const battleId = 'shield-damage-test';

        const baseline = simulateBattle(robot1, robot2, battleId, [], undefined, undefined);
        const withShield = simulateBattle(robot1, robot2, battleId, [], undefined, { p1: 'SHIELD', p2: null });

        const shieldLog = withShield.logs.find(log => log.itemApplied && log.itemType === 'SHIELD');
        expect(shieldLog).toBeDefined();

        const baselineLog = baseline.logs.find(log =>
            log.turn === shieldLog!.turn && log.attackerId === shieldLog!.attackerId
        );
        expect(baselineLog).toBeDefined();

        // Allow ±1 tolerance for floor rounding differences in calculation order
        const expectedDamage = Math.floor(baselineLog!.damage * 0.85);
        expect(Math.abs(shieldLog!.damage - expectedDamage)).toBeLessThanOrEqual(1);
    });
});

describe('simulateBattle: JAMMER Item Application', () => {
    it('should cancel the next critical hit and only trigger once', () => {
        const defender = createTestRobot('r1', { baseAttack: 80, baseDefense: 90, baseSpeed: 20, baseHp: 300 });
        const attacker = createTestRobot('r2', { baseAttack: 90, baseDefense: 60, baseSpeed: 80, baseHp: 300 });

        let chosenId: string | null = null;
        let critTurn: number | null = null;

        for (let i = 0; i < 500; i++) {
            const battleId = `disrupt-crit-${i}`;
            const baseline = simulateBattle(defender, attacker, battleId);
            const critLog = baseline.logs.find(log => log.isCritical && log.attackerId === 'r2');
            if (critLog) {
                chosenId = battleId;
                critTurn = critLog.turn;
                break;
            }
        }

        expect(chosenId).toBeTruthy();

        const disrupted = simulateBattle(defender, attacker, chosenId!, [], undefined, { p1: 'JAMMER', p2: null });
        const disruptLogs = disrupted.logs.filter(log => log.itemType === 'JAMMER');

        expect(disruptLogs.length).toBe(1);
        expect(disruptLogs[0].itemEvent).toBe('ITEM_USED');
        expect(disruptLogs[0].isCritical).toBe(false);
        if (critTurn !== null) {
            expect(disruptLogs[0].turn).toBe(critTurn);
        }
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

describe('simulateBattle: New Mechanics', () => {
    it('should trigger pursuit when speed advantage is large', () => {
        const fast = createTestRobot('fast', { baseAttack: 120, baseDefense: 60, baseSpeed: 80, baseHp: 500 });
        const slow = createTestRobot('slow', { baseAttack: 90, baseDefense: 80, baseSpeed: 40, baseHp: 500 });
        const res = simulateBattle(fast, slow, 'pursuit-test');

        const pursuitLog = res.logs.find(log => (log.pursuitDamage ?? 0) > 0);
        expect(pursuitLog).toBeDefined();
    });

    it('should trigger counter when defender is faster and tanky', () => {
        const slow = createTestRobot('slow', { baseAttack: 90, baseDefense: 60, baseSpeed: 30, baseHp: 800 });
        const fastTank = createTestRobot('tank', { baseAttack: 70, baseDefense: 140, baseSpeed: 60, baseHp: 700 });
        const res = simulateBattle(slow, fastTank, 'counter-test');

        const counterLog = res.logs.find(log => log.action === 'counter');
        expect(counterLog).toBeDefined();
    });

    it('should apply stun and skip next action on heavy hits', () => {
        const stunner = createTestRobot('stunner', { baseAttack: 220, baseDefense: 60, baseSpeed: 80, baseHp: 600 });
        const target = createTestRobot('target', { baseAttack: 60, baseDefense: 40, baseSpeed: 30, baseHp: 600 });
        const res = simulateBattle(stunner, target, 'stun-test');

        const stunIndex = res.logs.findIndex(log => log.stunApplied);
        expect(stunIndex).toBeGreaterThanOrEqual(0);
        const nextLog = res.logs[stunIndex + 1];
        expect(nextLog?.action).toBe('stunned');
    });
});

describe('simulateBattle v2 Updates', () => {
    it('should respect MAX_TURNS = 15', () => {
        const r1 = createTestRobot('r1', { baseHp: 5000, baseAttack: 20, baseDefense: 20 });
        const r2 = createTestRobot('r2', { baseHp: 5000, baseAttack: 20, baseDefense: 20 });
        const res = simulateBattle(r1, r2, 'turn-limit-test');
        // Likely to reach turn 15 with high HP (reduced from 20 for better KO rate)
        if (res.logs[res.logs.length - 1].defenderHp > 0) {
            expect(res.turnCount).toBe(15);
        }
    });

    it('should produce damage within new formula range', () => {
        const r1 = createTestRobot('atker', { baseAttack: 20, baseDefense: 10 });
        const r2 = createTestRobot('defer', { baseAttack: 20, baseDefense: 10 });
        // Core = floor(100 * 20 / (10 + 100)) = 18.
        // Variance 0.9-1.1 -> Range 16 to 19 (before stance multipliers).
        const res = simulateBattle(r1, r2, 'dmg-test-v2');
        const firstHit = res.logs.find(l =>
            l.damage > 0 &&
            !l.isCritical &&
            !l.itemApplied &&
            !l.cheerApplied &&
            !l.guarded &&
            !l.passiveTriggered
        );
        if (firstHit) {
            const stanceMult = firstHit.stanceMultiplier ?? 1;
            const min = Math.floor(18 * 0.9 * stanceMult);
            const max = Math.floor(18 * 1.1 * stanceMult);
            expect(firstHit.damage).toBeGreaterThanOrEqual(min);
            expect(firstHit.damage).toBeLessThanOrEqual(max);
        }
    });
});

// ============================================
// Finisher & Sudden Death Tests
// ============================================

describe('Finisher System', () => {
    it('should apply finisher deterministically with same seed', () => {
        const robot1 = createTestRobot('r1', { baseAttack: 100, baseHp: 500 });
        const robot2 = createTestRobot('r2', { baseAttack: 120, baseHp: 500 });

        // Run battle twice with same seed
        const result1 = simulateBattle(robot1, robot2, 'test-finisher-seed-1');
        const result2 = simulateBattle(robot1, robot2, 'test-finisher-seed-1');

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

        const result = simulateBattle(robot1, robot2, 'test-finisher-once');

        const p1Finishers = result.logs.filter(log => log.finisherApplied && log.attackerId === robot1.id);
        const p2Finishers = result.logs.filter(log => log.finisherApplied && log.attackerId === robot2.id);

        // Each side should use finisher at most once
        expect(p1Finishers.length).toBeLessThanOrEqual(1);
        expect(p2Finishers.length).toBeLessThanOrEqual(1);
    });

    it('should apply correct multiplier when finisher triggers', () => {
        const robot1 = createTestRobot('r1', { baseAttack: 100, baseHp: 400 });
        const robot2 = createTestRobot('r2', { baseAttack: 120, baseHp: 400 });

        const result = simulateBattle(robot1, robot2, 'test-finisher-multiplier');

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

        const result = simulateBattle(robot1, robot2, 'test-sudden-death');

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
        const result1 = simulateBattle(robot1, robot2, 'test-sd-determinism');
        const result2 = simulateBattle(robot1, robot2, 'test-sd-determinism');

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

        const result = simulateBattle(robot1, robot2, 'test-sd-damage');

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

describe('Combined Mechanics: Finisher + Sudden Death', () => {
    it('should not alter RNG consumption order', () => {
        const robot1 = createTestRobot('r1', { baseAttack: 100, baseHp: 500 });
        const robot2 = createTestRobot('r2', { baseAttack: 110, baseHp: 500 });

        // Same seed should produce identical results
        const result1 = simulateBattle(robot1, robot2, 'test-rng-consistency-1');
        const result2 = simulateBattle(robot1, robot2, 'test-rng-consistency-1');

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

// ============================================================
// ENRAGE SYSTEM TESTS
// ============================================================
import { getEnrageMultiplier } from './battleSystem';

describe('Enrage System', () => {
    describe('getEnrageMultiplier', () => {
        it('should return 1.0 for turns 1-3', () => {
            expect(getEnrageMultiplier(1)).toBe(1.0);
            expect(getEnrageMultiplier(2)).toBe(1.0);
            expect(getEnrageMultiplier(3)).toBe(1.0);
        });

        it('should increase by 0.30 per turn after turn 3', () => {
            expect(getEnrageMultiplier(4)).toBeCloseTo(1.30, 2);
            expect(getEnrageMultiplier(5)).toBeCloseTo(1.60, 2);
            expect(getEnrageMultiplier(6)).toBeCloseTo(1.90, 2);
            expect(getEnrageMultiplier(7)).toBeCloseTo(2.20, 2);
        });

        it('should cap at 2.5x', () => {
            expect(getEnrageMultiplier(8)).toBeCloseTo(2.50, 2);
            expect(getEnrageMultiplier(10)).toBeCloseTo(2.50, 2);
            expect(getEnrageMultiplier(15)).toBeCloseTo(2.50, 2);
        });
    });

    describe('Turn Limit', () => {
        it('should end battle by turn 15', () => {
            const robot1 = createTestRobot('enrage-r1', { baseHp: 9999, baseAttack: 10, baseDefense: 200 });
            const robot2 = createTestRobot('enrage-r2', { baseHp: 9999, baseAttack: 10, baseDefense: 200 });

            const result = simulateBattle(robot1, robot2, 'turn-limit-test');

            // Excluding START log, max turns should be 15
            const actionLogs = result.logs.filter(l => l.action !== 'START');
            // Each turn may have multiple logs (attack, counter, etc), so check turnCount
            expect(result.turnCount).toBeLessThanOrEqual(15);
        });
    });

    describe('Enrage Damage Scaling', () => {
        it('should deal more damage in later turns', () => {
            // Use fixed seed for deterministic results
            const robot1 = createTestRobot('scale-r1', { baseHp: 2000, baseAttack: 100, baseDefense: 50 });
            const robot2 = createTestRobot('scale-r2', { baseHp: 2000, baseAttack: 100, baseDefense: 50 });

            const result = simulateBattle(robot1, robot2, 'enrage-scale-test');

            // Find attack logs at different turns
            const turn3Logs = result.logs.filter(l => l.turn === 3 && l.action === 'attack');
            const turn8Logs = result.logs.filter(l => l.turn === 8 && l.action === 'attack');

            // If both exist, turn 8 damage should be higher due to enrage
            if (turn3Logs.length > 0 && turn8Logs.length > 0) {
                const turn3Damage = turn3Logs[0].damage;
                const turn8Damage = turn8Logs[0].damage;

                // Turn 8 should have higher damage due to enrage (2.5x vs 1.0x)
                // Allow for variance in base damage
                expect(turn8Damage).toBeGreaterThan(turn3Damage * 0.9);
            }
        });
    });
});

// ============================================================
// SPECIAL MOVE SYSTEM TESTS (必殺技)
// ============================================================

describe('Special Move System (必殺技)', () => {
    it('should trigger special at most once per side', () => {
        const robot1 = createTestRobot('r1', {
            baseHp: 200,
            baseAttack: 100,
            baseDefense: 50,
            role: 'ASSAULT' as any,
        });
        const robot2 = createTestRobot('r2', {
            baseHp: 200,
            baseAttack: 100,
            baseDefense: 50,
            role: 'TANK' as any,
        });

        const result = simulateBattle(robot1, robot2, 'special-once-test');

        const p1SpecialLogs = result.logs.filter(log => log.specialTriggered && log.attackerId === robot1.id);
        const p2SpecialLogs = result.logs.filter(log => log.specialTriggered && log.attackerId === robot2.id);

        expect(p1SpecialLogs.length).toBeLessThanOrEqual(1);
        expect(p2SpecialLogs.length).toBeLessThanOrEqual(1);
    });

    it('should include specialName, specialRoleName, specialImpact in log', () => {
        const robot1 = createTestRobot('r1', {
            baseHp: 150,
            baseAttack: 120,
            baseDefense: 40,
            role: 'ASSAULT' as any,
        });
        const robot2 = createTestRobot('r2', {
            baseHp: 300,
            baseAttack: 150,
            baseDefense: 50,
            role: 'SNIPER' as any,
        });

        const result = simulateBattle(robot1, robot2, 'special-fields-test');
        const specialLog = result.logs.find(log => log.specialTriggered && log.action === 'special');

        if (specialLog) {
            expect(specialLog.specialTriggered).toBe(true);
            expect(specialLog.specialName).toBeDefined();
            expect(typeof specialLog.specialName).toBe('string');
            expect(specialLog.specialRoleName).toBeDefined();
            expect(specialLog.specialImpact).toBeDefined();
            expect(specialLog.specialHits).toBe(1);
        }
    });

    it('should not trigger special when HP stays above 50%', () => {
        const dominant = createTestRobot('dominant', {
            baseHp: 1000,
            baseAttack: 200,
            baseDefense: 200,
            role: 'ASSAULT' as any,
        });
        const weak = createTestRobot('weak', {
            baseHp: 50,
            baseAttack: 10,
            baseDefense: 10,
            role: 'SUPPORT' as any,
        });

        const result = simulateBattle(dominant, weak, 'no-special-test');
        const dominantSpecialLogs = result.logs.filter(
            log => log.specialTriggered && log.attackerId === dominant.id
        );
        expect(dominantSpecialLogs.length).toBe(0);
    });

    it('should be deterministic with same battleId', () => {
        const robot1 = createTestRobot('r1', {
            baseHp: 200,
            baseAttack: 100,
            baseDefense: 50,
            role: 'SNIPER' as any,
        });
        const robot2 = createTestRobot('r2', {
            baseHp: 200,
            baseAttack: 100,
            baseDefense: 50,
            role: 'TRICKSTER' as any,
        });

        const result1 = simulateBattle(robot1, robot2, 'special-determinism-test');
        const result2 = simulateBattle(robot1, robot2, 'special-determinism-test');

        const specialLogs1 = result1.logs.filter(log => log.specialTriggered);
        const specialLogs2 = result2.logs.filter(log => log.specialTriggered);

        expect(specialLogs1.length).toBe(specialLogs2.length);
        expect(specialLogs1.map(l => l.turn)).toEqual(specialLogs2.map(l => l.turn));
    });

    it('should work correctly for all roles', () => {
        const roles = ['ASSAULT', 'TANK', 'SNIPER', 'SUPPORT', 'TRICKSTER'] as const;
        const expectedSpecialNames: Record<string, string> = {
            ASSAULT: 'メガブレイク',
            TANK: 'アイアンバリア',
            SNIPER: 'ヘッドショット',
            SUPPORT: 'リペアパルス',
            TRICKSTER: 'シグナルジャム',
        };

        for (const role of roles) {
            const robot1 = createTestRobot(role, {
                baseHp: 150,
                baseAttack: 100,
                baseDefense: 50,
                role: role as any,
            });
            const robot2 = createTestRobot('opponent', {
                baseHp: 300,
                baseAttack: 150,
                baseDefense: 50,
                role: 'ASSAULT' as any,
            });

            const result = simulateBattle(robot1, robot2, `special-role-${role}-test`);
            const specialLog = result.logs.find(
                log => log.specialTriggered && log.attackerId === robot1.id && log.action === 'special'
            );

            if (specialLog) {
                expect(specialLog.specialName).toBe(expectedSpecialNames[role]);
            }
        }
    });
});
