/**
 * Battle Simulation Script
 * Runs 30 battles and outputs statistics for balance tuning
 * 
 * Usage: npx ts-node --esm scripts/battleSimulation.ts
 */

import { simulateBattle } from "../src/battleSystem.js";
import { RobotData } from "../src/types.js";

// Generate test robots with varied stats
const generateTestRobot = (id: string, seed: number): RobotData => {
    const baseHp = 800 + (seed * 47) % 400;  // 800-1200
    const baseAttack = 80 + (seed * 31) % 60;  // 80-140
    const baseDefense = 70 + (seed * 29) % 50;  // 70-120
    const baseSpeed = 40 + (seed * 23) % 40;   // 40-80

    return {
        id,
        name: `TestBot_${id}`,
        baseHp,
        baseAttack,
        baseDefense,
        baseSpeed,
        level: 1 + (seed % 10),  // Level 1-10
        skills: [],
        parts: { head: 1, body: 1, arms: 1, legs: 1 },
        colors: { primary: '#00f3ff', secondary: '#ff0055' },
    } as RobotData;
};

const NUM_BATTLES = 30;

interface BattleStats {
    battleId: number;
    turns: number;
    isKO: boolean;
    winnerId: string;
    hp1Remaining: number;
    hp2Remaining: number;
}

const runSimulation = () => {
    const results: BattleStats[] = [];

    console.log("=== Battle Simulation Started ===");
    console.log(`Running ${NUM_BATTLES} battles...\n`);

    for (let i = 0; i < NUM_BATTLES; i++) {
        const robot1 = generateTestRobot(`p1_${i}`, i * 2);
        const robot2 = generateTestRobot(`p2_${i}`, i * 2 + 1);
        const battleId = `sim_${i}_${Date.now()}`;

        const result = simulateBattle(robot1, robot2, battleId);

        // Determine if KO or judgment
        const finalLog = result.logs[result.logs.length - 1];
        const hp1 = result.logs.find(l => l.attackerId === robot1.id)?.attackerHp ?? 0;
        const hp2 = result.logs.find(l => l.attackerId === robot2.id)?.attackerHp ?? 0;

        // Check if either HP reached 0
        const isKO = result.logs.some(log =>
            log.attackerHp <= 0 || log.defenderHp <= 0
        );

        results.push({
            battleId: i + 1,
            turns: result.turnCount || result.logs.filter(l => l.action !== 'START').length,
            isKO,
            winnerId: result.winnerId,
            hp1Remaining: Math.max(0, hp1),
            hp2Remaining: Math.max(0, hp2),
        });

        console.log(`Battle ${i + 1}: ${result.turnCount || '?'} turns, ${isKO ? 'KO' : 'JUDGMENT'}, Winner: ${result.winnerId.slice(0, 6)}`);
    }

    // Calculate statistics
    const totalTurns = results.reduce((sum, r) => sum + r.turns, 0);
    const avgTurns = totalTurns / NUM_BATTLES;
    const koCount = results.filter(r => r.isKO).length;
    const judgmentCount = NUM_BATTLES - koCount;
    const koRate = (koCount / NUM_BATTLES) * 100;

    console.log("\n=== RESULTS ===");
    console.log(`Total Battles: ${NUM_BATTLES}`);
    console.log(`Average Turns: ${avgTurns.toFixed(2)}`);
    console.log(`KO Victories: ${koCount} (${koRate.toFixed(1)}%)`);
    console.log(`Judgment Victories: ${judgmentCount} (${(100 - koRate).toFixed(1)}%)`);
    console.log(`Turn Distribution:`);

    const turnBuckets: Record<string, number> = {};
    results.forEach(r => {
        const bucket = r.turns <= 5 ? '1-5' : r.turns <= 10 ? '6-10' : r.turns <= 15 ? '11-15' : '16-20';
        turnBuckets[bucket] = (turnBuckets[bucket] || 0) + 1;
    });
    Object.entries(turnBuckets).forEach(([bucket, count]) => {
        console.log(`  ${bucket} turns: ${count} battles (${((count / NUM_BATTLES) * 100).toFixed(1)}%)`);
    });

    console.log("\n=== KPI CHECK ===");
    console.log(`Target Avg Turns: 6-10 | Actual: ${avgTurns.toFixed(2)} ${avgTurns >= 6 && avgTurns <= 10 ? '✅' : '❌'}`);
    console.log(`Target KO Rate: 95%+ | Actual: ${koRate.toFixed(1)}% ${koRate >= 95 ? '✅' : '❌'}`);

    return { avgTurns, koRate, results };
};

runSimulation();
