const test = require("node:test");
const assert = require("node:assert/strict");
const { simulateBattle } = require("../lib/battleSystem");

const createRobot = (overrides) => ({
  id: "robot",
  name: "Robot",
  baseHp: 2000,
  baseAttack: 120,
  baseDefense: 80,
  baseSpeed: 100,
  elementType: 1,
  elementName: "Fire",
  skills: [],
  ...overrides
});

test("same battleId produces the same result", () => {
  const robotA = createRobot({ id: "robot-a", name: "Alpha", elementType: 1 });
  const robotB = createRobot({ id: "robot-b", name: "Beta", elementType: 2, baseSpeed: 90 });

  const resultA = simulateBattle(robotA, robotB, "battle-123");
  const resultB = simulateBattle(robotA, robotB, "battle-123");

  assert.deepStrictEqual(resultA, resultB);
  assert.ok(resultA.logs.length <= 30);
});
