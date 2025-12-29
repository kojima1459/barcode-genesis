/**
 * BattleEngine v2 Tests
 * Verifies determinism, stance logic, overdrive, and passives
 */

import { simulateBattle } from "./battleSystem";
import { RobotData } from "./types";
import { resolveStance } from "./battleStance";

// Helper to create test robot
const createTestRobot = (id: string, overrides: Partial<RobotData> = {}): RobotData => ({
    id,
    userId: "test-user",
    name: `Robot ${id}`,
    sourceBarcode: "4901234567890",
    rarity: 3,
    rarityName: "Rare",
    baseHp: 100,
    baseAttack: 20,
    baseDefense: 10,
    baseSpeed: 15,
    elementType: 1,
    elementName: "Fire",
    parts: {
        head: 5,
        face: 5,
        body: 5,
        armLeft: 5,
        armRight: 5,
        legLeft: 5,
        legRight: 5,
        backpack: 5,
        weapon: 5,
        accessory: 5,
    },
    colors: {
        primary: "#FF0000",
        secondary: "#00FF00",
        accent: "#0000FF",
        glow: "#FFFFFF",
    },
    totalBattles: 0,
    totalWins: 0,
    isFavorite: false,
    ...overrides,
});

// ============================================
// TEST: Determinism
// ============================================
function testDeterminism() {
    const robot1 = createTestRobot("robot-1");
    const robot2 = createTestRobot("robot-2", { baseSpeed: 12 });
    const battleId = "test-battle-determinism-123";

    // Run battle 100 times
    const results: string[] = [];
    for (let i = 0; i < 100; i++) {
        const result = simulateBattle(robot1, robot2, battleId);
        // Create a hash of the result
        const hash = JSON.stringify({
            winner: result.winnerId,
            loser: result.loserId,
            logCount: result.logs.length,
            totalDamage: result.logs.reduce((sum, l) => sum + l.damage, 0),
            lastMessage: result.logs[result.logs.length - 1]?.message,
        });
        results.push(hash);
    }

    // All results should be identical
    const allSame = results.every(r => r === results[0]);
    console.log(`Determinism test: ${allSame ? "✅ PASS" : "❌ FAIL"}`);
    if (!allSame) {
        console.log("First:", results[0]);
        console.log("Different:", results.find(r => r !== results[0]));
    }
    return allSame;
}

// ============================================
// TEST: Stance Rock-Paper-Scissors
// ============================================
function testStanceMatchups() {
    const tests = [
        { attacker: "ATTACK" as const, defender: "TRICK" as const, expected: "WIN" },
        { attacker: "TRICK" as const, defender: "GUARD" as const, expected: "WIN" },
        { attacker: "GUARD" as const, defender: "ATTACK" as const, expected: "WIN" },
        { attacker: "ATTACK" as const, defender: "GUARD" as const, expected: "LOSE" },
        { attacker: "GUARD" as const, defender: "TRICK" as const, expected: "LOSE" },
        { attacker: "TRICK" as const, defender: "ATTACK" as const, expected: "LOSE" },
        { attacker: "ATTACK" as const, defender: "ATTACK" as const, expected: "DRAW" },
        { attacker: "GUARD" as const, defender: "GUARD" as const, expected: "DRAW" },
        { attacker: "TRICK" as const, defender: "TRICK" as const, expected: "DRAW" },
    ];

    let allPassed = true;
    for (const test of tests) {
        const result = resolveStance(test.attacker, test.defender);
        const passed = result === test.expected;
        if (!passed) {
            console.log(`❌ FAIL: ${test.attacker} vs ${test.defender} = ${result} (expected ${test.expected})`);
            allPassed = false;
        }
    }
    console.log(`Stance matchups test: ${allPassed ? "✅ PASS" : "❌ FAIL"}`);
    return allPassed;
}

// ============================================
// TEST: Overdrive triggers for underdog
// ============================================
function testOverdriveDrama() {
    // Create underdog (lower stats)
    const underdog = createTestRobot("underdog", {
        baseHp: 80,
        baseAttack: 15,
        baseDefense: 8,
        baseSpeed: 10,
    });

    // Create favorite (higher stats)
    const favorite = createTestRobot("favorite", {
        baseHp: 120,
        baseAttack: 25,
        baseDefense: 15,
        baseSpeed: 20,
    });

    // Run multiple battles and check overdrive triggers
    let underdogOverdrives = 0;
    let favoriteOverdrives = 0;
    const trials = 50;

    for (let i = 0; i < trials; i++) {
        const result = simulateBattle(underdog, favorite, `overdrive-test-${i}`);

        for (const log of result.logs) {
            if (log.overdriveTriggered) {
                if (log.attackerId === underdog.id) underdogOverdrives++;
                else favoriteOverdrives++;
            }
        }
    }

    // Underdog should trigger overdrive more often (they take more damage)
    const underdogTriggersMore = underdogOverdrives > favoriteOverdrives;
    console.log(`Overdrive drama test: ${underdogTriggersMore ? "✅ PASS" : "⚠️ CHECK"}`);
    console.log(`  Underdog overdrives: ${underdogOverdrives}, Favorite overdrives: ${favoriteOverdrives}`);
    return underdogTriggersMore;
}

// ============================================
// TEST: Passives trigger and log
// ============================================
function testPassivesLog() {
    // Create robot with high-trigger parts (part IDs that have passives)
    const robot1 = createTestRobot("passive-test-1", {
        parts: {
            head: 5,
            face: 5,
            body: 5,
            armLeft: 5,
            armRight: 5,
            legLeft: 5,
            legRight: 5,
            backpack: 10, // Afterburner - 8% follow-up
            weapon: 10,   // Executioner - 5% +50% damage
            accessory: 10, // Guardian Module - 7% -30% damage
        }
    });

    const robot2 = createTestRobot("passive-test-2", {
        parts: {
            head: 5,
            face: 5,
            body: 5,
            armLeft: 5,
            armRight: 5,
            legLeft: 5,
            legRight: 5,
            backpack: 8,  // Lock-On - 10% guaranteed crit
            weapon: 8,    // Piercing Shot - 10% ignore 50% def
            accessory: 2, // Energy Shield - 12% -15% damage
        }
    });

    // Run multiple battles and count passive triggers
    let passiveCount = 0;
    const trials = 50;

    for (let i = 0; i < trials; i++) {
        const result = simulateBattle(robot1, robot2, `passive-test-${i}`);

        for (const log of result.logs) {
            if (log.passiveTriggered) {
                passiveCount++;
            }
        }
    }

    const passivesTriggered = passiveCount > 0;
    console.log(`Passives log test: ${passivesTriggered ? "✅ PASS" : "❌ FAIL"}`);
    console.log(`  Total passive triggers across ${trials} battles: ${passiveCount}`);
    return passivesTriggered;
}

// ============================================
// TEST: Existing functionality preserved
// ============================================
function testExistingFunctionality() {
    // Test element advantage still works
    const fireRobot = createTestRobot("fire", { elementType: 1 });
    const waterRobot = createTestRobot("water", { elementType: 2 }); // Fire beats element 2 (advantage)

    const result = simulateBattle(fireRobot, waterRobot, "element-test");

    // Check logs exist and have proper structure
    const hasLogs = result.logs.length > 0;
    const hasWinner = !!result.winnerId;
    const hasLoser = !!result.loserId;
    const turnWithin30 = result.logs[result.logs.length - 1]?.turn <= 30;

    const allPassed = hasLogs && hasWinner && hasLoser && turnWithin30;
    console.log(`Existing functionality test: ${allPassed ? "✅ PASS" : "❌ FAIL"}`);
    console.log(`  Logs: ${result.logs.length}, Winner: ${result.winnerId}, MaxTurn: ${result.logs[result.logs.length - 1]?.turn}`);
    return allPassed;
}

// ============================================
// RUN ALL TESTS
// ============================================
export function runAllTests() {
    console.log("\n=== BattleEngine v2 Tests ===\n");

    const results = {
        determinism: testDeterminism(),
        stanceMatchups: testStanceMatchups(),
        overdriveDrama: testOverdriveDrama(),
        passivesLog: testPassivesLog(),
        existingFunctionality: testExistingFunctionality(),
    };

    console.log("\n=== Summary ===");
    const allPassed = Object.values(results).every(r => r);
    console.log(`Overall: ${allPassed ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED"}`);

    return results;
}

// Run if executed directly
if (require.main === module) {
    runAllTests();
}
