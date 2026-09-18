/**
 * Contract tests for the usage meter: what a read costs and what is left.
 * Money arithmetic, so the cases are exact rather than approximate.
 * Run with: npm test
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  balanceState,
  canImport,
  costMicroUsd,
  estimateImportsLeft,
  monthStart,
  packFor,
  PACKS,
  TOKENS_PER_TYPICAL_IMPORT,
} from "../src/lib/usage.ts";

/* ---------------- cost ---------------- */

test("the run measured in COMMERCIAL.md still costs what it cost", () => {
  // 1078 input and 2380 output tokens were billed at $0.0063.
  const micro = costMicroUsd({ inputTokens: 1078, cachedTokens: 0, outputTokens: 2380 });
  assert.equal(micro, 6274);
});

test("output tokens cost more than input tokens", () => {
  const input = costMicroUsd({ inputTokens: 10_000, cachedTokens: 0, outputTokens: 0 });
  const output = costMicroUsd({ inputTokens: 0, cachedTokens: 0, outputTokens: 10_000 });
  assert.ok(output > input);
});

test("nothing read costs nothing", () => {
  assert.equal(costMicroUsd({ inputTokens: 0, cachedTokens: 0, outputTokens: 0 }), 0);
});

test("a negative count cannot credit the account", () => {
  assert.equal(costMicroUsd({ inputTokens: -5_000, cachedTokens: 0, outputTokens: 0 }), 0);
});

test("cost rounds up, so a fractional read is never free", () => {
  assert.equal(costMicroUsd({ inputTokens: 1, cachedTokens: 0, outputTokens: 0 }), 1);
});

/* ---------------- balance ---------------- */

test("a new account has nothing, because there is no free allowance", () => {
  const state = balanceState(0);
  assert.equal(state.credits, 0);
  assert.equal(state.importsLeft, 0);
  assert.ok(state.exhausted);
  assert.ok(!canImport(state), "nobody reads a document before buying credits");
});

test("bought credits are what allows a read", () => {
  const state = balanceState(150_000);
  assert.equal(state.credits, 150_000);
  assert.ok(state.importsLeft > 0);
  assert.ok(canImport(state));
});

test("a spent balance stops the next read", () => {
  assert.ok(balanceState(0).exhausted);
  assert.ok(!canImport(balanceState(0)));
});

test("a balance smaller than one read still allows the attempt", () => {
  // What a read costs cannot be known until it is done, so any balance at all
  // is permission to try. The overshoot floors at zero in the ledger.
  const state = balanceState(1);
  assert.equal(state.importsLeft, 0, "nothing whole is promised");
  assert.ok(canImport(state), "but the attempt is allowed");
});

test("a negative balance is never reported", () => {
  const state = balanceState(-5_000);
  assert.equal(state.credits, 0);
  assert.ok(state.exhausted);
});

test("imports left is a whole number of reads, rounded down", () => {
  assert.equal(estimateImportsLeft(TOKENS_PER_TYPICAL_IMPORT * 2), 2);
  assert.equal(estimateImportsLeft(TOKENS_PER_TYPICAL_IMPORT * 2 - 1), 1);
  assert.equal(estimateImportsLeft(0), 0);
});

/* ---------------- packs ---------------- */

test("every pack buys more tokens than it costs pesos, and is findable", () => {
  for (const pack of PACKS) {
    assert.ok(pack.tokens > 0);
    assert.ok(pack.php > 0);
    assert.equal(packFor(pack.id)?.id, pack.id);
  }
});

test("a bigger pack is better value per peso", () => {
  const perPeso = PACKS.map((pack) => pack.tokens / pack.php);
  for (let i = 1; i < perPeso.length; i += 1) {
    assert.ok(perPeso[i] >= perPeso[i - 1], "packs must not get worse value as they grow");
  }
});

test("an unknown pack id buys nothing", () => {
  assert.equal(packFor("unlimited"), null);
  assert.equal(packFor(undefined), null);
});

/* ---------------- the month ---------------- */

test("spend is reported from the first of the month", () => {
  assert.equal(monthStart(new Date("2026-09-18T10:00:00Z")).toISOString(), "2026-09-01T00:00:00.000Z");
  assert.equal(monthStart(new Date("2026-01-01T00:00:00Z")).toISOString(), "2026-01-01T00:00:00.000Z");
});
