"use strict";
/**
 * BattleSystem Vitest Integration Tests
 * - Seed determinism
 * - Cheer application verification
 * - HP transition integrity
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const battleSystem_1 = require("./battleSystem");
// Helper: Create test robot
const createTestRobot = (id, overrides = {}) => (Object.assign({ id, userId: 'test-user', name: `Robot ${id}`, sourceBarcode: '4901234567890', rarity: 3, rarityName: 'Rare', baseHp: 100, baseAttack: 20, baseDefense: 10, baseSpeed: 15, elementType: 1, elementName: 'Fire', parts: {
        head: 5, face: 5, body: 5, armLeft: 5, armRight: 5,
        legLeft: 5, legRight: 5, backpack: 5, weapon: 5, accessory: 5,
    }, colors: {
        primary: '#FF0000', secondary: '#00FF00',
        accent: '#0000FF', glow: '#FFFFFF',
    }, totalBattles: 0, totalWins: 0, isFavorite: false }, overrides));
(0, vitest_1.describe)('simulateBattle: Seed Determinism', () => {
    (0, vitest_1.it)('should produce identical results for same battleId', () => {
        const robot1 = createTestRobot('robot-1');
        const robot2 = createTestRobot('robot-2', { baseSpeed: 12 });
        const battleId = 'determinism-test-fixed';
        const results = [];
        for (let i = 0; i < 10; i++) {
            results.push((0, battleSystem_1.simulateBattle)(robot1, robot2, battleId));
        }
        // All results should be identical
        for (let i = 1; i < results.length; i++) {
            (0, vitest_1.expect)(results[i].winnerId).toBe(results[0].winnerId);
            (0, vitest_1.expect)(results[i].loserId).toBe(results[0].loserId);
            (0, vitest_1.expect)(results[i].logs.length).toBe(results[0].logs.length);
            // Deep check: every log should match
            for (let j = 0; j < results[i].logs.length; j++) {
                (0, vitest_1.expect)(results[i].logs[j].damage).toBe(results[0].logs[j].damage);
                (0, vitest_1.expect)(results[i].logs[j].attackerHp).toBe(results[0].logs[j].attackerHp);
                (0, vitest_1.expect)(results[i].logs[j].defenderHp).toBe(results[0].logs[j].defenderHp);
            }
        }
    });
    (0, vitest_1.it)('should produce identical results with same cheer input', () => {
        const robot1 = createTestRobot('robot-1');
        const robot2 = createTestRobot('robot-2');
        const battleId = 'cheer-determinism-test';
        const cheer = { p1: true, p2: false };
        const result1 = (0, battleSystem_1.simulateBattle)(robot1, robot2, battleId, [], cheer);
        const result2 = (0, battleSystem_1.simulateBattle)(robot1, robot2, battleId, [], cheer);
        (0, vitest_1.expect)(result1.winnerId).toBe(result2.winnerId);
        (0, vitest_1.expect)(result1.logs.length).toBe(result2.logs.length);
        (0, vitest_1.expect)(JSON.stringify(result1.logs)).toBe(JSON.stringify(result2.logs));
    });
});
(0, vitest_1.describe)('simulateBattle: Cheer Application', () => {
    (0, vitest_1.it)('should apply cheerApplied exactly once for P1 when p1 cheer is true', () => {
        const robot1 = createTestRobot('robot-1');
        const robot2 = createTestRobot('robot-2');
        const battleId = 'cheer-p1-test';
        const result = (0, battleSystem_1.simulateBattle)(robot1, robot2, battleId, [], { p1: true, p2: false });
        const cheerAppliedLogs = result.logs.filter(log => log.cheerApplied);
        (0, vitest_1.expect)(cheerAppliedLogs.length).toBe(1);
        (0, vitest_1.expect)(cheerAppliedLogs[0].cheerSide).toBe('P1');
        (0, vitest_1.expect)(cheerAppliedLogs[0].attackerId).toBe('robot-1');
    });
    (0, vitest_1.it)('should apply cheerApplied exactly once for P2 when p2 cheer is true', () => {
        const robot1 = createTestRobot('robot-1');
        const robot2 = createTestRobot('robot-2');
        const battleId = 'cheer-p2-test';
        const result = (0, battleSystem_1.simulateBattle)(robot1, robot2, battleId, [], { p1: false, p2: true });
        const cheerAppliedLogs = result.logs.filter(log => log.cheerApplied);
        (0, vitest_1.expect)(cheerAppliedLogs.length).toBe(1);
        (0, vitest_1.expect)(cheerAppliedLogs[0].cheerSide).toBe('P2');
        (0, vitest_1.expect)(cheerAppliedLogs[0].attackerId).toBe('robot-2');
    });
    (0, vitest_1.it)('should apply cheerApplied twice when both p1 and p2 cheer are true', () => {
        const robot1 = createTestRobot('robot-1');
        const robot2 = createTestRobot('robot-2');
        const battleId = 'cheer-both-test';
        const result = (0, battleSystem_1.simulateBattle)(robot1, robot2, battleId, [], { p1: true, p2: true });
        const cheerAppliedLogs = result.logs.filter(log => log.cheerApplied);
        (0, vitest_1.expect)(cheerAppliedLogs.length).toBe(2);
        (0, vitest_1.expect)(cheerAppliedLogs.some(l => l.cheerSide === 'P1')).toBe(true);
        (0, vitest_1.expect)(cheerAppliedLogs.some(l => l.cheerSide === 'P2')).toBe(true);
    });
    (0, vitest_1.it)('should not apply cheer when no cheer input', () => {
        const robot1 = createTestRobot('robot-1');
        const robot2 = createTestRobot('robot-2');
        const battleId = 'no-cheer-test';
        const result = (0, battleSystem_1.simulateBattle)(robot1, robot2, battleId);
        const cheerAppliedLogs = result.logs.filter(log => log.cheerApplied);
        (0, vitest_1.expect)(cheerAppliedLogs.length).toBe(0);
    });
});
(0, vitest_1.describe)('simulateBattle: Cheer Damage Multiplier', () => {
    (0, vitest_1.it)('should apply 1.2x damage for cheered attack', () => {
        const robot1 = createTestRobot('robot-1');
        const robot2 = createTestRobot('robot-2');
        const battleId = 'cheer-damage-test';
        // Run without cheer first
        const resultNoCheer = (0, battleSystem_1.simulateBattle)(robot1, robot2, battleId, [], undefined);
        // Run with P1 cheer
        const resultWithCheer = (0, battleSystem_1.simulateBattle)(robot1, robot2, battleId, [], { p1: true, p2: false });
        // Find the turn where cheer was applied
        const cheerLog = resultWithCheer.logs.find(log => log.cheerApplied && log.cheerSide === 'P1');
        (0, vitest_1.expect)(cheerLog).toBeDefined();
        // Find the corresponding turn in no-cheer result
        const noCheerLog = resultNoCheer.logs.find(log => log.turn === cheerLog.turn && log.attackerId === cheerLog.attackerId);
        (0, vitest_1.expect)(noCheerLog).toBeDefined();
        // Verify 1.2x multiplier (allow for floor rounding)
        const expectedDamage = Math.floor(noCheerLog.damage * 1.2);
        (0, vitest_1.expect)(cheerLog.damage).toBe(expectedDamage);
        (0, vitest_1.expect)(cheerLog.cheerMultiplier).toBe(1.2);
    });
});
(0, vitest_1.describe)('simulateBattle: HP Transition Integrity', () => {
    (0, vitest_1.it)('should have consistent HP values based on damage', () => {
        const robot1 = createTestRobot('robot-1', { baseHp: 150 });
        const robot2 = createTestRobot('robot-2', { baseHp: 120 });
        const battleId = 'hp-integrity-test';
        const result = (0, battleSystem_1.simulateBattle)(robot1, robot2, battleId, [], { p1: true, p2: true });
        let hp1 = 150;
        let hp2 = 120;
        for (const log of result.logs) {
            if (log.damage > 0 && log.action !== 'heal') {
                // Attacker deals damage to defender
                if (log.attackerId === 'robot-1') {
                    hp2 -= log.damage;
                    (0, vitest_1.expect)(log.defenderHp).toBe(Math.max(0, hp2));
                }
                else {
                    hp1 -= log.damage;
                    (0, vitest_1.expect)(log.defenderHp).toBe(Math.max(0, hp1));
                }
            }
        }
    });
});
// TODO: Future test - verify cheer can change battle outcome in close matchups
// Skipped for now to avoid flaky tests. Could be implemented by finding a fixed
// battleId where cheer swings the result.
//# sourceMappingURL=battleSystem.vitest.js.map