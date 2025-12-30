const test = require("node:test");
const assert = require("node:assert/strict");
const { SeededRandom } = require("../lib/functions/src/seededRandom");

test("same seed yields the same sequence", () => {
  const rngA = new SeededRandom("same-seed");
  const rngB = new SeededRandom("same-seed");
  const seqA = Array.from({ length: 5 }, () => rngA.next());
  const seqB = Array.from({ length: 5 }, () => rngB.next());
  assert.deepStrictEqual(seqA, seqB);
});

test("different seeds yield different sequences", () => {
  const rngA = new SeededRandom("seed-a");
  const rngB = new SeededRandom("seed-b");
  const seqA = Array.from({ length: 5 }, () => rngA.next());
  const seqB = Array.from({ length: 5 }, () => rngB.next());
  assert.notDeepStrictEqual(seqA, seqB);
});

test("next stays within [0, 1)", () => {
  const rng = new SeededRandom("range-seed");
  for (let i = 0; i < 1000; i += 1) {
    const value = rng.next();
    assert.ok(value >= 0 && value < 1);
  }
});

test("nextInt stays within inclusive bounds", () => {
  const rng = new SeededRandom("int-seed");
  for (let i = 0; i < 1000; i += 1) {
    const value = rng.nextInt(1, 10);
    assert.ok(value >= 1 && value <= 10);
  }
});

test("nextBool with 0.3 probability stays within expected range", () => {
  const rng = new SeededRandom("probability-seed");
  let count = 0;
  for (let i = 0; i < 10000; i += 1) {
    if (rng.nextBool(0.3)) count += 1;
  }
  assert.ok(count >= 2800 && count <= 3200);
});
