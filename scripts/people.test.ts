/**
 * Contract tests for how a person is named in the interface.
 * Run with: npm test
 */
import assert from "node:assert/strict";
import test from "node:test";
import { firstName, initial } from "../src/lib/people.ts";

test("a full name is cut down to the first part", () => {
  assert.equal(firstName("Renz Aron Gorre"), "Renz");
  assert.equal(firstName("Maria Cristina Santos Reyes"), "Maria");
});

test("a single name is left alone", () => {
  assert.equal(firstName("Madonna"), "Madonna");
});

test("stray whitespace does not become a name", () => {
  assert.equal(firstName("  Renz   Aron  "), "Renz");
  assert.equal(firstName("\tJuan\tDela Cruz"), "Juan");
});

test("a missing name falls back rather than rendering nothing", () => {
  assert.equal(firstName(null), "You");
  assert.equal(firstName(undefined), "You");
  assert.equal(firstName(""), "You");
  assert.equal(firstName("   "), "You");
  assert.equal(firstName(null, "Signed in"), "Signed in");
});

test("a hyphenated given name stays whole", () => {
  assert.equal(firstName("Mary-Grace Lim"), "Mary-Grace");
});

test("the blank avatar takes the first letter, upper cased", () => {
  assert.equal(initial("renz aron gorre"), "R");
  assert.equal(initial("Madonna"), "M");
});

test("the blank avatar has something to show for a missing name", () => {
  assert.equal(initial(null), "?");
  assert.equal(initial("   "), "?");
});
