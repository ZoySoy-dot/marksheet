/**
 * Contract tests for how long an unclaimed quiz survives in a browser.
 * Run with: npm test
 */
import assert from "node:assert/strict";
import test from "node:test";
import { hasExpired, LOCAL_TTL_MS, msLeft, timeLeftLabel, type SavedSheet } from "../src/lib/mine.ts";

const madeAgo = (ms: number): SavedSheet => ({
  slug: "abc12345",
  title: "Whatever",
  editToken: "t".repeat(32),
  questionCount: 3,
  createdAt: new Date(Date.now() - ms).toISOString(),
});

test("a quiz made just now has nearly the full window left", () => {
  const left = msLeft(madeAgo(0));
  assert.ok(left > LOCAL_TTL_MS - 5_000 && left <= LOCAL_TTL_MS);
});

test("a fresh quiz has not expired", () => {
  assert.equal(hasExpired(madeAgo(60_000)), false);
});

test("a quiz past the window has expired", () => {
  assert.equal(hasExpired(madeAgo(LOCAL_TTL_MS + 1_000)), true);
});

test("expiry is exactly at the window, not after it", () => {
  assert.equal(hasExpired(madeAgo(LOCAL_TTL_MS)), true);
  assert.equal(hasExpired(madeAgo(LOCAL_TTL_MS - 60_000)), false);
});

test("a record with an unusable timestamp counts as stale, not eternal", () => {
  const broken = { ...madeAgo(0), createdAt: "not a date" };
  assert.equal(hasExpired(broken), true);
  const missing = { ...madeAgo(0), createdAt: "" };
  assert.equal(hasExpired(missing), true);
});

test("the label reads in hours, then minutes, then under a minute", () => {
  // A brand new quiz is a hair under the full window, and everything rounds
  // down, so either side of the boundary is correct.
  assert.match(timeLeftLabel(madeAgo(0)), /^[56] hours$/);
  assert.equal(timeLeftLabel(madeAgo(LOCAL_TTL_MS - 90 * 60_000)), "1 hour");
  assert.equal(timeLeftLabel(madeAgo(LOCAL_TTL_MS - 35 * 60_000)), "35 minutes");
  assert.equal(timeLeftLabel(madeAgo(LOCAL_TTL_MS - 30_000)), "under a minute");
  assert.equal(timeLeftLabel(madeAgo(LOCAL_TTL_MS + 60_000)), "expired");
});

test("the label never rounds up past the real deadline", () => {
  // 119 minutes left must not read as "2 hours".
  assert.equal(timeLeftLabel(madeAgo(LOCAL_TTL_MS - 119 * 60_000)), "1 hour");
});

test("the window is a few hours, not days", () => {
  const hours = LOCAL_TTL_MS / 3_600_000;
  assert.ok(hours >= 1 && hours <= 12, `expected a few hours, got ${hours}`);
});
