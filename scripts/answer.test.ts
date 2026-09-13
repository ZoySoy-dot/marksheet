/**
 * Contract tests for marking a typed answer.
 * Run with: npm test
 */
import assert from "node:assert/strict";
import test from "node:test";
import { matchesAnswer } from "../src/lib/answer.ts";

test("accepts the answer as written", () => {
  assert.equal(matchesAnswer("Paris", ["Paris"]), true);
});

test("case and surrounding space are not the answer", () => {
  assert.equal(matchesAnswer("  paris ", ["Paris"]), true);
  assert.equal(matchesAnswer("PARIS", ["Paris"]), true);
});

test("a trailing full stop is not a wrong answer", () => {
  assert.equal(matchesAnswer("Paris.", ["Paris"]), true);
});

test("runs of space collapse", () => {
  assert.equal(matchesAnswer("New    York", ["New York"]), true);
});

test("a different answer is still wrong", () => {
  assert.equal(matchesAnswer("London", ["Paris"]), false);
});

test("blank is never right", () => {
  assert.equal(matchesAnswer("", ["Paris"]), false);
  assert.equal(matchesAnswer("   ", ["Paris"]), false);
});

test("any listed form is accepted", () => {
  const accepted = ["4", "four"];
  assert.equal(matchesAnswer("four", accepted), true);
  assert.equal(matchesAnswer("4", accepted), true);
  assert.equal(matchesAnswer("five", accepted), false);
});

test("maths matches regardless of spacing commands", () => {
  assert.equal(matchesAnswer("$2x$", ["$2\\,x$"]), true);
  assert.equal(matchesAnswer("$\\left(x+1\\right)$", ["$(x+1)$"]), true);
});

test("redundant braces do not change the answer", () => {
  assert.equal(matchesAnswer("$x^{2}$", ["$x^2$"]), true);
});

test("cdot and times read as multiplication", () => {
  assert.equal(matchesAnswer("$2\\cdot x$", ["$2\\times x$"]), true);
});

test("dfrac and frac are the same fraction", () => {
  assert.equal(matchesAnswer("$\\dfrac{1}{2}$", ["$\\frac{1}{2}$"]), true);
});

test("different maths is still wrong", () => {
  assert.equal(matchesAnswer("$2x$", ["$3x$"]), false);
  assert.equal(matchesAnswer("$x^2$", ["$x^3$"]), false);
});

test("the editor deciding something is maths does not fail the answer", () => {
  // Whether a short answer is stored as text or as maths depends on what was
  // typed around it, which is not something the person answering controls.
  assert.equal(matchesAnswer("x", ["$x$"]), true);
  assert.equal(matchesAnswer("$x$", ["x"]), true);
});

test("equivalence is not claimed", () => {
  // 2x and x+x are equal; only the listed form is accepted, on purpose.
  assert.equal(matchesAnswer("$x+x$", ["$2x$"]), false);
});
