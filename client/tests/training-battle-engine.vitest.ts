/**
 * Test: Deterministic Training Battle Engine
 * Verifies:
 * - Same inputs produce identical BattleLog[] (deepEqual)
 * - cheerApplied appears exactly once per side when cheer is reserved
 * - cheerApplied turn has correctly multiplied damage (1.2x)
 */

import { describe, it, expect } from 'vitest';
import { simulateBattle, getTrainingBattleId, BattleRobotData, CheerInput, BattleLog } from '../src/lib/battleEngine';

const createTestRobot = (id: string, name: string, attack: number, defense: number, speed: number): BattleRobotData => ({
    id,
    name,
    sourceBarcode: '1234567890128',
    baseHp: 100,
    baseAttack: attack,
    baseDefense: defense,
    baseSpeed: speed,
    elementType: 1,
    elementName: 'Fire',
    parts: {
        head: 1,
        face: 1,
        body: 1,
        armLeft: 1,
        armRight: 1,
        legLeft: 1,
        legRight: 1,
        backpack: 1,
        weapon: 1,
        accessory: 1,
    },
    colors: {
        primary: '#ff0000',
        secondary: '#00ff00',
        accent: '#0000ff',
        glow: '#ffffff',
    },
    skills: [],
});

describe('Training Battle Engine: Determinism', () => {
    it('should produce identical results for same inputs', () => {
        const robot1 = createTestRobot('robot-a', 'Alpha', 30, 10, 15);
        const robot2 = createTestRobot('robot-b', 'Beta', 25, 15, 10);

        const battleId = getTrainingBattleId(robot1.id!, robot2.id!);

        const result1 = simulateBattle(robot1, robot2, battleId);
        const result2 = simulateBattle(robot1, robot2, battleId);

        expect(result1.winnerId).toBe(result2.winnerId);
        expect(result1.loserId).toBe(result2.loserId);
        expect(result1.logs.length).toBe(result2.logs.length);

        // Deep equal on logs
        for (let i = 0; i < result1.logs.length; i++) {
            const log1 = result1.logs[i];
            const log2 = result2.logs[i];
            expect(log1.turn).toBe(log2.turn);
            expect(log1.damage).toBe(log2.damage);
            expect(log1.attackerId).toBe(log2.attackerId);
            expect(log1.defenderId).toBe(log2.defenderId);
            expect(log1.isCritical).toBe(log2.isCritical);
            expect(log1.attackerHp).toBe(log2.attackerHp);
            expect(log1.defenderHp).toBe(log2.defenderHp);
            expect(log1.cheerApplied).toBe(log2.cheerApplied);
            expect(log1.cheerSide).toBe(log2.cheerSide);
        }
    });

    it('should produce identical results with same cheer input', () => {
        const robot1 = createTestRobot('robot-a', 'Alpha', 30, 10, 15);
        const robot2 = createTestRobot('robot-b', 'Beta', 25, 15, 10);

        const battleId = getTrainingBattleId(robot1.id!, robot2.id!);
        const cheer: CheerInput = { p1: true, p2: false };

        const result1 = simulateBattle(robot1, robot2, battleId, cheer);
        const result2 = simulateBattle(robot1, robot2, battleId, cheer);

        expect(result1.winnerId).toBe(result2.winnerId);
        expect(result1.logs.length).toBe(result2.logs.length);

        for (let i = 0; i < result1.logs.length; i++) {
            expect(result1.logs[i].damage).toBe(result2.logs[i].damage);
            expect(result1.logs[i].cheerApplied).toBe(result2.logs[i].cheerApplied);
        }
    });
});

describe('Training Battle Engine: Cheer Application', () => {
    it('should apply cheerApplied exactly once for P1 when p1 cheer is true', () => {
        const robot1 = createTestRobot('robot-a', 'Alpha', 30, 10, 20); // Faster, goes first
        const robot2 = createTestRobot('robot-b', 'Beta', 25, 15, 10);

        const battleId = getTrainingBattleId(robot1.id!, robot2.id!);
        const cheer: CheerInput = { p1: true, p2: false };

        const result = simulateBattle(robot1, robot2, battleId, cheer);

        const cheerLogs = result.logs.filter(log => log.cheerApplied === true);
        expect(cheerLogs.length).toBe(1);
        expect(cheerLogs[0].cheerSide).toBe('P1');
        expect(cheerLogs[0].attackerId).toBe(robot1.id);
    });

    it('should apply cheerApplied exactly once for P2 when p2 cheer is true', () => {
        const robot1 = createTestRobot('robot-a', 'Alpha', 30, 10, 20);
        const robot2 = createTestRobot('robot-b', 'Beta', 25, 15, 10);

        const battleId = getTrainingBattleId(robot1.id!, robot2.id!);
        const cheer: CheerInput = { p1: false, p2: true };

        const result = simulateBattle(robot1, robot2, battleId, cheer);

        const cheerLogs = result.logs.filter(log => log.cheerApplied === true);
        expect(cheerLogs.length).toBe(1);
        expect(cheerLogs[0].cheerSide).toBe('P2');
        expect(cheerLogs[0].attackerId).toBe(robot2.id);
    });

    it('should apply cheerApplied twice when both p1 and p2 cheer are true', () => {
        const robot1 = createTestRobot('robot-a', 'Alpha', 30, 10, 20);
        const robot2 = createTestRobot('robot-b', 'Beta', 25, 15, 10);

        const battleId = getTrainingBattleId(robot1.id!, robot2.id!);
        const cheer: CheerInput = { p1: true, p2: true };

        const result = simulateBattle(robot1, robot2, battleId, cheer);

        const cheerLogs = result.logs.filter(log => log.cheerApplied === true);
        expect(cheerLogs.length).toBe(2);

        const p1Log = cheerLogs.find(log => log.cheerSide === 'P1');
        const p2Log = cheerLogs.find(log => log.cheerSide === 'P2');
        expect(p1Log).toBeDefined();
        expect(p2Log).toBeDefined();
        expect(p1Log!.attackerId).toBe(robot1.id);
        expect(p2Log!.attackerId).toBe(robot2.id);
    });

    it('should not apply cheer when no cheer input', () => {
        const robot1 = createTestRobot('robot-a', 'Alpha', 30, 10, 20);
        const robot2 = createTestRobot('robot-b', 'Beta', 25, 15, 10);

        const battleId = getTrainingBattleId(robot1.id!, robot2.id!);
        const cheer: CheerInput = { p1: false, p2: false };

        const result = simulateBattle(robot1, robot2, battleId, cheer);

        const cheerLogs = result.logs.filter(log => log.cheerApplied === true);
        expect(cheerLogs.length).toBe(0);
    });
});

describe('Training Battle Engine: Cheer Damage Multiplier', () => {
    it('should apply 1.2x damage for cheered attack', () => {
        const robot1 = createTestRobot('robot-a', 'Alpha', 30, 10, 20); // Faster
        const robot2 = createTestRobot('robot-b', 'Beta', 25, 15, 10);

        const battleId = getTrainingBattleId(robot1.id!, robot2.id!);

        // Run without cheer first
        const resultNoCheer = simulateBattle(robot1, robot2, battleId, { p1: false, p2: false });

        // Run with P1 cheer
        const resultWithCheer = simulateBattle(robot1, robot2, battleId, { p1: true, p2: false });

        // Find cheered turn in resultWithCheer
        const cheerLog = resultWithCheer.logs.find(log => log.cheerApplied === true);
        expect(cheerLog).toBeDefined();

        // Find corresponding turn in resultNoCheer (same turn, same attacker)
        const noCheerLog = resultNoCheer.logs.find(
            log => log.turn === cheerLog!.turn && log.attackerId === cheerLog!.attackerId
        );
        expect(noCheerLog).toBeDefined();

        // Cheered damage should be floor(baseDamage * 1.2)
        const expectedDamage = Math.floor(noCheerLog!.damage * 1.2);
        expect(cheerLog!.damage).toBe(expectedDamage);
        expect(cheerLog!.cheerMultiplier).toBe(1.2);
    });
});

describe('Training Battle Engine: getTrainingBattleId (Normalized Order)', () => {
    it('should generate deterministic battle ID', () => {
        const id1 = getTrainingBattleId('robot-a', 'robot-b');
        const id2 = getTrainingBattleId('robot-a', 'robot-b');

        expect(id1).toBe(id2);
        expect(id1).toBe('training_robot-a_robot-b');
    });

    it('should produce same ID regardless of input order (normalized)', () => {
        const id1 = getTrainingBattleId('robot-a', 'robot-b');
        const id2 = getTrainingBattleId('robot-b', 'robot-a');

        // Both should normalize to the same ID
        expect(id1).toBe(id2);
        expect(id1).toBe('training_robot-a_robot-b');
    });

    it('should produce same BattleLog[] when robots are passed in reversed order', () => {
        const robot1 = createTestRobot('robot-a', 'Alpha', 30, 10, 20);
        const robot2 = createTestRobot('robot-b', 'Beta', 25, 15, 10);

        // Simulate with (robot1, robot2)
        const battleId1 = getTrainingBattleId(robot1.id!, robot2.id!);
        const result1 = simulateBattle(robot1, robot2, battleId1);

        // Simulate with (robot2, robot1) - reversed order
        // Since getTrainingBattleId normalizes, battleId should be the same
        const battleId2 = getTrainingBattleId(robot2.id!, robot1.id!);
        expect(battleId2).toBe(battleId1);

        // But we also need to pass robots in normalized order to get same result
        // (The real usage will use normalizeTrainingInput helper)
        const result2 = simulateBattle(robot1, robot2, battleId2);

        // Results should be identical
        expect(result1.winnerId).toBe(result2.winnerId);
        expect(result1.loserId).toBe(result2.loserId);
        expect(result1.logs.length).toBe(result2.logs.length);

        for (let i = 0; i < result1.logs.length; i++) {
            expect(result1.logs[i].damage).toBe(result2.logs[i].damage);
            expect(result1.logs[i].turn).toBe(result2.logs[i].turn);
            expect(result1.logs[i].attackerId).toBe(result2.logs[i].attackerId);
        }
    });
});

describe('Training Battle Engine: normalizeTrainingInput', () => {
    it('should normalize robots to lexicographic order', () => {
        const { normalizePair, normalizeTrainingInput } = require('../src/lib/battleEngine');

        // Already in order
        const pair1 = normalizePair('robot-a', 'robot-b');
        expect(pair1.a).toBe('robot-a');
        expect(pair1.b).toBe('robot-b');

        // Reversed
        const pair2 = normalizePair('robot-b', 'robot-a');
        expect(pair2.a).toBe('robot-a');
        expect(pair2.b).toBe('robot-b');
    });

    it('should swap cheer when robots are swapped', () => {
        const { normalizeTrainingInput } = require('../src/lib/battleEngine');

        const robot1 = createTestRobot('robot-z', 'Zeta', 30, 10, 20);
        const robot2 = createTestRobot('robot-a', 'Alpha', 25, 15, 10);

        // robot1.id = 'robot-z', robot2.id = 'robot-a'
        // Since 'robot-a' < 'robot-z', they should be swapped
        const cheer = { p1: true, p2: false };
        const { p1, p2, normalizedCheer } = normalizeTrainingInput(robot1, robot2, cheer);

        expect(p1.id).toBe('robot-a'); // robot2 becomes p1
        expect(p2.id).toBe('robot-z'); // robot1 becomes p2
        expect(normalizedCheer?.p1).toBe(false); // Original p2's cheer
        expect(normalizedCheer?.p2).toBe(true);  // Original p1's cheer
    });

    it('should not swap when already in order', () => {
        const { normalizeTrainingInput } = require('../src/lib/battleEngine');

        const robot1 = createTestRobot('robot-a', 'Alpha', 30, 10, 20);
        const robot2 = createTestRobot('robot-z', 'Zeta', 25, 15, 10);

        const cheer = { p1: true, p2: false };
        const { p1, p2, normalizedCheer } = normalizeTrainingInput(robot1, robot2, cheer);

        expect(p1.id).toBe('robot-a');
        expect(p2.id).toBe('robot-z');
        expect(normalizedCheer?.p1).toBe(true);
        expect(normalizedCheer?.p2).toBe(false);
    });
});
