/**
 * Contract tests for the math field conversion.
 * A plain answer must survive as plain text, or the format stops being readable.
 * Run with: npm test
 */
import assert from "node:assert/strict";
import test from "node:test";
import { fieldToStored, storedToField } from "../src/lib/mathfield.ts";

/* ---------------- field -> stored ---------------- */

test("an answer that is only words is stored as plain text", () => {
  assert.equal(fieldToStored("\\text{Layer 3, network}"), "Layer 3, network");
});

test("an answer with real maths is wrapped in dollars", () => {
  assert.equal(fieldToStored("\\frac{1}{2}"), "$\\frac{1}{2}$");
});

test("a mix of words and maths stays maths", () => {
  const mixed = "\\text{about }\\frac{1}{2}";
  assert.equal(fieldToStored(mixed), `$${mixed}$`);
});

test("text followed by more text is not mistaken for a whole-text span", () => {
  // Two separate spans must not be unwrapped, or the second would be lost.
  const two = "\\text{a}\\text{b}";
  assert.equal(fieldToStored(two), `$${two}$`);
});

test("an empty field stores nothing", () => {
  assert.equal(fieldToStored(""), "");
  assert.equal(fieldToStored("   "), "");
});

test("escaped characters come back as themselves", () => {
  assert.equal(fieldToStored("\\text{50\\% off}"), "50% off");
  assert.equal(fieldToStored("\\text{a\\_b}"), "a_b");
  assert.equal(fieldToStored("\\text{\\$5}"), "$5");
});

test("braces inside text do not end the span early", () => {
  assert.equal(fieldToStored("\\text{set \\{1, 2\\}}"), "set {1, 2}");
});

/* ---------------- stored -> field ---------------- */

test("plain text becomes a text span", () => {
  assert.equal(storedToField("Layer 3, network"), "\\text{Layer 3, network}");
});

test("maths is handed over without the dollars", () => {
  assert.equal(storedToField("$\\frac{1}{2}$"), "\\frac{1}{2}");
});

test("display maths loses both pairs of dollars", () => {
  assert.equal(storedToField("$$\\int_0^1 x\\,dx$$"), "\\int_0^1 x\\,dx");
});

test("characters that would break a text span are escaped", () => {
  assert.equal(storedToField("50% off"), "\\text{50\\% off}");
  assert.equal(storedToField("a_b"), "\\text{a\\_b}");
  assert.equal(storedToField("set {1, 2}"), "\\text{set \\{1, 2\\}}");
});

test("nothing in, nothing out", () => {
  assert.equal(storedToField(""), "");
  assert.equal(storedToField("  "), "");
});

/* ---------------- round trips ---------------- */

test("plain answers round trip unchanged", () => {
  for (const answer of [
    "Layer 3, network",
    "Paris",
    "They speed up reads and slow down writes",
    "50% off",
    "a_b",
    "set {1, 2}",
  ]) {
    assert.equal(fieldToStored(storedToField(answer)), answer, `failed on ${answer}`);
  }
});

test("maths answers round trip unchanged", () => {
  for (const answer of ["$\\frac{1}{2}$", "$x^2 - 5x + 6 = 0$", "$O(n \\log n)$"]) {
    assert.equal(fieldToStored(storedToField(answer)), answer, `failed on ${answer}`);
  }
});

test("a plain answer never becomes maths by accident", () => {
  // The whole point: this must not end up as $\text{...}$ in the source.
  const stored = fieldToStored(storedToField("Routers forward on IP addresses"));
  assert.ok(!stored.startsWith("$"), `got ${stored}`);
});
