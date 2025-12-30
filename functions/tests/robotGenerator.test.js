const test = require("node:test");
const assert = require("node:assert/strict");
const {
  assertRobotNotExists,
  DuplicateRobotError,
  generateRobotFromBarcode,
  InvalidBarcodeError
} = require("../lib/functions/src/robotGenerator");

const BARCODE = "4901234567890";
const USER_ID = "test-user";

test("same barcode yields the same robot", () => {
  const first = generateRobotFromBarcode(BARCODE, USER_ID);
  const second = generateRobotFromBarcode(BARCODE, USER_ID);
  assert.deepStrictEqual(first, second);
});

test("rejects non-13-digit barcodes", () => {
  assert.throws(() => generateRobotFromBarcode("12345", USER_ID), InvalidBarcodeError);
  assert.throws(() => generateRobotFromBarcode("123456789012a", USER_ID), InvalidBarcodeError);
});

test("stats, parts, and colors stay within spec ranges", () => {
  const robot = generateRobotFromBarcode(BARCODE, USER_ID);

  assert.ok(robot.baseHp >= 100 && robot.baseHp <= 3000);
  assert.ok(robot.baseAttack >= 10 && robot.baseAttack <= 300);
  assert.ok(robot.baseDefense >= 10 && robot.baseDefense <= 300);

  Object.values(robot.parts).forEach((value) => {
    assert.ok(value >= 1 && value <= 10);
  });

  const hexPattern = /^#[0-9a-fA-F]{6}$/;
  Object.values(robot.colors).forEach((value) => {
    assert.ok(hexPattern.test(value));
  });
});

test("duplicate barcode returns already-exists", () => {
  let caught;
  try {
    assertRobotNotExists(true);
  } catch (error) {
    caught = error;
  }

  assert.ok(caught instanceof DuplicateRobotError);
  assert.equal(caught.code, "already-exists");
});
