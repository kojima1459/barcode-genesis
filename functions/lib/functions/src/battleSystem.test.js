"use strict";
/**
 * BattleEngine v2 Tests
 * Verifies determinism, stance logic, overdrive, and passives
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAllTests = void 0;
const battleSystem_1 = require("./battleSystem");
const battleStance_1 = require("./battleStance");
// Helper to create test robot
const createTestRobot = (id, overrides = {}) => (Object.assign({ id, userId: "test-user", name: `Robot ${id}`, sourceBarcode: "4901234567890", rarity: 3, rarityName: "Rare", baseHp: 100, baseAttack: 20, baseDefense: 10, baseSpeed: 15, elementType: 1, elementName: "Fire", parts: {
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
    }, colors: {
        primary: "#FF0000",
        secondary: "#00FF00",
        accent: "#0000FF",
        glow: "#FFFFFF",
    }, totalBattles: 0, totalWins: 0, isFavorite: false }, overrides));
// ============================================
// TEST: Determinism
// ============================================
function testDeterminism() {
    var _a;
    const robot1 = createTestRobot("robot-1");
    const robot2 = createTestRobot("robot-2", { baseSpeed: 12 });
    const battleId = "test-battle-determinism-123";
    // Run battle 100 times
    const results = [];
    for (let i = 0; i < 100; i++) {
        const result = (0, battleSystem_1.simulateBattle)(robot1, robot2, battleId);
        // Create a hash of the result
        const hash = JSON.stringify({
            winner: result.winnerId,
            loser: result.loserId,
            logCount: result.logs.length,
            totalDamage: result.logs.reduce((sum, l) => sum + l.damage, 0),
            lastMessage: (_a = result.logs[result.logs.length - 1]) === null || _a === void 0 ? void 0 : _a.message,
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
        { attacker: "ATTACK", defender: "TRICK", expected: "WIN" },
        { attacker: "TRICK", defender: "GUARD", expected: "WIN" },
        { attacker: "GUARD", defender: "ATTACK", expected: "WIN" },
        { attacker: "ATTACK", defender: "GUARD", expected: "LOSE" },
        { attacker: "GUARD", defender: "TRICK", expected: "LOSE" },
        { attacker: "TRICK", defender: "ATTACK", expected: "LOSE" },
        { attacker: "ATTACK", defender: "ATTACK", expected: "DRAW" },
        { attacker: "GUARD", defender: "GUARD", expected: "DRAW" },
        { attacker: "TRICK", defender: "TRICK", expected: "DRAW" },
    ];
    let allPassed = true;
    for (const test of tests) {
        const result = (0, battleStance_1.resolveStance)(test.attacker, test.defender);
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
        const result = (0, battleSystem_1.simulateBattle)(underdog, favorite, `overdrive-test-${i}`);
        for (const log of result.logs) {
            if (log.overdriveTriggered) {
                if (log.attackerId === underdog.id)
                    underdogOverdrives++;
                else
                    favoriteOverdrives++;
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
            backpack: 10,
            weapon: 10,
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
            backpack: 8,
            weapon: 8,
            accessory: 2, // Energy Shield - 12% -15% damage
        }
    });
    // Run multiple battles and count passive triggers
    let passiveCount = 0;
    const trials = 50;
    for (let i = 0; i < trials; i++) {
        const result = (0, battleSystem_1.simulateBattle)(robot1, robot2, `passive-test-${i}`);
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
    var _a, _b;
    // Test element advantage still works
    const fireRobot = createTestRobot("fire", { elementType: 1 });
    const waterRobot = createTestRobot("water", { elementType: 2 }); // Fire beats element 2 (advantage)
    const result = (0, battleSystem_1.simulateBattle)(fireRobot, waterRobot, "element-test");
    // Check logs exist and have proper structure
    const hasLogs = result.logs.length > 0;
    const hasWinner = !!result.winnerId;
    const hasLoser = !!result.loserId;
    const turnWithin30 = ((_a = result.logs[result.logs.length - 1]) === null || _a === void 0 ? void 0 : _a.turn) <= 30;
    const allPassed = hasLogs && hasWinner && hasLoser && turnWithin30;
    console.log(`Existing functionality test: ${allPassed ? "✅ PASS" : "❌ FAIL"}`);
    console.log(`  Logs: ${result.logs.length}, Winner: ${result.winnerId}, MaxTurn: ${(_b = result.logs[result.logs.length - 1]) === null || _b === void 0 ? void 0 : _b.turn}`);
    return allPassed;
}
// ============================================
// RUN ALL TESTS
// ============================================
function runAllTests() {
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
exports.runAllTests = runAllTests;
// Run if executed directly
if (require.main === module) {
    runAllTests();
}
//# sourceMappingURL=battleSystem.test.js.map