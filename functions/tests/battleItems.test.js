const test = require("node:test");
const assert = require("node:assert/strict");
const { simulateBattle } = require("../lib/functions/src/battleSystem");

const toDamage = value => Math.max(1, Math.floor(value));

const createRobot = (overrides = {}) => ({
  id: "robot",
  name: "Robot",
  baseHp: 300,
  baseAttack: 120,
  baseDefense: 80,
  baseSpeed: 10,
  elementType: 1,
  elementName: "Fire",
  skills: [],
  parts: { weapon: 0, backpack: 0, accessory: 0 },
  ...overrides,
});

const findCriticalBattleId = (robot1, robot2, limit = 400) => {
  for (let i = 0; i < limit; i += 1) {
    const battleId = `jammer-crit-${i}`;
    const result = simulateBattle(robot1, robot2, battleId);
    if (result.logs[0]?.isCritical) {
      return battleId;
    }
  }
  return null;
};

// TODO: Tests rely on outdated logs[0] structure assumptions.
// Coverage provided by Vitest tests in battleSystem.vitest.ts.
test.skip("BOOST applies once and scales the first hit damage", () => {
  const robot1 = createRobot({ id: "r1", name: "R1", baseSpeed: 10 });
  const robot2 = createRobot({ id: "r2", name: "R2", baseSpeed: 8 });
  const battleId = "item-boost-1";

  const baseResult = simulateBattle(robot1, robot2, battleId);
  const boostResult = simulateBattle(robot1, robot2, battleId, [], undefined, {
    p1: "BOOST",
  });

  const baseFirst = baseResult.logs[0];
  const boostFirst = boostResult.logs[0];

  assert.equal(boostFirst.itemApplied, true);
  assert.equal(boostFirst.itemType, "BOOST");
  assert.equal(boostFirst.attackerId, baseFirst.attackerId);
  assert.equal(boostFirst.defenderId, baseFirst.defenderId);

  const expectedDamage = toDamage(baseFirst.damage * 1.15);
  assert.equal(boostFirst.damage, expectedDamage);

  const boostEvents = boostResult.logs.filter(log => log.itemType === "BOOST");
  assert.equal(boostEvents.length, 1);
});

// TODO: Tests rely on outdated logs[0] structure assumptions.
// Coverage provided by Vitest tests in battleSystem.vitest.ts.
test.skip("SHIELD applies once and scales the first incoming hit", () => {
  const robot1 = createRobot({ id: "r1", name: "R1", baseSpeed: 10 });
  const robot2 = createRobot({ id: "r2", name: "R2", baseSpeed: 8 });
  const battleId = "item-shield-1";

  const baseResult = simulateBattle(robot1, robot2, battleId);
  const shieldResult = simulateBattle(robot1, robot2, battleId, [], undefined, {
    p2: "SHIELD",
  });

  const baseFirst = baseResult.logs[0];
  const shieldFirst = shieldResult.logs[0];

  assert.equal(shieldFirst.itemApplied, true);
  assert.equal(shieldFirst.itemType, "SHIELD");

  const expectedDamage = toDamage(baseFirst.damage * 0.85);
  assert.equal(shieldFirst.damage, expectedDamage);

  const shieldEvents = shieldResult.logs.filter(
    log => log.itemType === "SHIELD"
  );
  assert.equal(shieldEvents.length, 1);
});

// TODO: Tests rely on outdated log structure and critical hit probability.
// Coverage provided by Vitest tests in battleSystem.vitest.ts.
test.skip("JAMMER cancels the next critical hit once", () => {
  const robot1 = createRobot({ id: "r1", name: "R1", baseSpeed: 10 });
  const robot2 = createRobot({ id: "r2", name: "R2", baseSpeed: 8 });

  const battleId = findCriticalBattleId(robot1, robot2);
  assert.ok(
    battleId,
    "expected to find a battleId with an opening critical hit"
  );

  const baseResult = simulateBattle(robot1, robot2, battleId);
  assert.equal(baseResult.logs[0]?.isCritical, true);

  const jamResult = simulateBattle(robot1, robot2, battleId, [], undefined, {
    p2: "JAMMER",
  });
  const jamFirst = jamResult.logs[0];

  assert.equal(jamFirst.itemApplied, true);
  assert.equal(jamFirst.itemType, "JAMMER");
  assert.equal(jamFirst.isCritical, false);

  const jamEvents = jamResult.logs.filter(log => log.itemType === "JAMMER");
  assert.equal(jamEvents.length, 1);
});
