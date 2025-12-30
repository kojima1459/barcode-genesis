const test = require("node:test");
const assert = require("node:assert/strict");
const { buildLedgerEntry } = require("../lib/functions/src/ledger");

test("ledger entry records craft deltas and defaults", () => {
  const entry = buildLedgerEntry({
    type: "CRAFT",
    deltaCredits: -10,
    deltaScanTokens: -1,
    refId: "craft:BOOST:1",
  });
  assert.equal(entry.type, "CRAFT");
  assert.equal(entry.deltaCredits, -10);
  assert.equal(entry.deltaScanTokens, -1);
  assert.equal(entry.deltaXp, 0);
  assert.equal(entry.refId, "craft:BOOST:1");
});
