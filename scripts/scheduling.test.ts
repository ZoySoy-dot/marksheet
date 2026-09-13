/**
 * Contract tests for card identity and implicit FSRS grading.
 * Run with: npm test
 */
import assert from "node:assert/strict";
import test from "node:test";
import { Rating, type Grade } from "ts-fsrs";
import { cardKey, cardKeysFor } from "../src/lib/cardKey.ts";
import {
  gradeAnswer,
  readingAllowanceMs,
  timeLimitMs,
  THINKING_LIMIT_MS,
  type TimingShape,
} from "../src/lib/scheduling.ts";

/* ---------------- card identity ---------------- */

test("the same question always gets the same key", () => {
  assert.equal(cardKey("Capital of France?"), cardKey("Capital of France?"));
});

test("spacing and capitalisation are not edits", () => {
  assert.equal(cardKey("Capital of France?"), cardKey("  capital   of France?  "));
});

test("a different question gets a different key", () => {
  assert.notEqual(cardKey("Capital of France?"), cardKey("Capital of Spain?"));
});

test("reordering a sheet does not disturb any key", () => {
  const before = cardKeysFor(["First?", "Second?", "Third?"]);
  const after = cardKeysFor(["Third?", "First?", "Second?"]);
  assert.deepEqual([...before].sort(), [...after].sort());
});

test("inserting a question leaves the others alone", () => {
  const before = cardKeysFor(["First?", "Second?"]);
  const after = cardKeysFor(["Brand new?", "First?", "Second?"]);
  assert.ok(after.includes(before[0]));
  assert.ok(after.includes(before[1]));
  assert.equal(after.length, 3);
});

test("two identical questions in one sheet stay distinct", () => {
  const keys = cardKeysFor(["Same?", "Same?"]);
  assert.notEqual(keys[0], keys[1]);
  assert.equal(new Set(keys).size, 2);
});

test("keys are fixed width hex", () => {
  assert.match(cardKey("anything at all"), /^[0-9a-f]{16}$/);
});

/* ---------------- reading allowance ---------------- */

const short: TimingShape = {
  text: "Capital of France?",
  options: [{ text: "London" }, { text: "Paris" }],
  multi: false,
};

const long: TimingShape = {
  text: "A router receives a packet whose destination address does not match any entry in its routing table, and no default route is configured. What does it do with the packet?",
  options: [
    { text: "Forwards it out of every interface except the one it arrived on" },
    { text: "Drops it and returns an ICMP destination unreachable message" },
    { text: "Queues it until a matching route is learned by the protocol" },
    { text: "Encapsulates it and forwards it to the nearest default gateway" },
  ],
  multi: false,
};

test("a long question is allowed more reading time than a short one", () => {
  assert.ok(readingAllowanceMs(long) > readingAllowanceMs(short) * 3);
});

test("picking several answers is allowed longer than picking one", () => {
  const single = readingAllowanceMs({ ...short, multi: false });
  const several = readingAllowanceMs({ ...short, multi: true });
  assert.ok(several > single);
});

test("the deadline is the reading allowance plus thinking time", () => {
  assert.equal(timeLimitMs(short), readingAllowanceMs(short) + THINKING_LIMIT_MS);
});

/* ---------------- grading ---------------- */

test("a wrong answer is Again however fast it was", () => {
  assert.equal(gradeAnswer(short, { correct: false, elapsedMs: 400 }), Rating.Again);
});

test("running out of time is Again even if the answer was right", () => {
  assert.equal(
    gradeAnswer(short, { correct: true, elapsedMs: 999_999, timedOut: true }),
    Rating.Again,
  );
});

test("an instant correct answer is Easy", () => {
  const at = readingAllowanceMs(short) + 1_000;
  assert.equal(gradeAnswer(short, { correct: true, elapsedMs: at }), Rating.Easy);
});

test("a normally paced correct answer is Good", () => {
  const at = readingAllowanceMs(short) + 6_000;
  assert.equal(gradeAnswer(short, { correct: true, elapsedMs: at }), Rating.Good);
});

test("a slow correct answer is Hard", () => {
  const at = readingAllowanceMs(short) + 25_000;
  assert.equal(gradeAnswer(short, { correct: true, elapsedMs: at }), Rating.Hard);
});

test("reading time is not counted as hesitation", () => {
  // Twelve seconds on a long question is reading, not struggling. The same
  // twelve seconds on a four word question is struggling.
  assert.equal(gradeAnswer(long, { correct: true, elapsedMs: 12_000 }), Rating.Easy);
  assert.equal(gradeAnswer(short, { correct: true, elapsedMs: 12_000 }), Rating.Good);
});

test("answering faster than the reading estimate still grades Easy", () => {
  assert.equal(gradeAnswer(long, { correct: true, elapsedMs: 500 }), Rating.Easy);
});

/* ---------------- the scheduler itself ---------------- */

test("FSRS defaults target 90 percent retention", async () => {
  const { generatorParameters } = await import("ts-fsrs");
  assert.equal(generatorParameters().request_retention, 0.9);
});

test("a harder grade never schedules further out than an easier one", async () => {
  const { fsrs, createEmptyCard, generatorParameters } = await import("ts-fsrs");
  const scheduler = fsrs(generatorParameters({ request_retention: 0.9 }));
  const now = new Date("2026-09-13T00:00:00Z");
  const card = createEmptyCard(now);

  const grades: Grade[] = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy];
  const due = grades.map((rating) =>
    new Date(scheduler.next(card, now, rating).card.due).getTime(),
  );

  for (let i = 1; i < due.length; i += 1) {
    assert.ok(due[i] >= due[i - 1], `rating ${i + 1} should not be due before rating ${i}`);
  }
});

test("typing an answer is not charged to recall", () => {
  // Same question, same eight seconds. Clicking one of four short options is
  // mostly thinking; typing "chlorophyll" is mostly typing.
  const chosen = { text: "Pigment that makes leaves green?", multi: false, options: [{ text: "chlorophyll" }, { text: "carotene" }] };
  const typed = { text: "Pigment that makes leaves green?", multi: false, options: [], kind: "typed" as const, accept: ["chlorophyll"] };

  assert.ok(readingAllowanceMs(typed) > readingAllowanceMs(chosen));
  assert.equal(gradeAnswer(typed, { correct: true, elapsedMs: 8_000 }), Rating.Easy);
});

test("a long typed answer earns more room than a short one", () => {
  const short = { text: "Symbol for iron?", multi: false, options: [], kind: "typed" as const, accept: ["Fe"] };
  const long = { text: "Symbol for iron?", multi: false, options: [], kind: "typed" as const, accept: ["ferrum, from the Latin"] };
  assert.ok(readingAllowanceMs(long) > readingAllowanceMs(short));
});

test("the quickest accepted wording sets the allowance", () => {
  const q = { text: "Symbol for iron?", multi: false, options: [], kind: "typed" as const, accept: ["a much longer wording", "Fe"] };
  const onlyShort = { text: "Symbol for iron?", multi: false, options: [], kind: "typed" as const, accept: ["Fe"] };
  assert.equal(readingAllowanceMs(q), readingAllowanceMs(onlyShort));
});

test("a wrong typed answer is still Again", () => {
  const typed = { text: "Symbol for iron?", multi: false, options: [], kind: "typed" as const, accept: ["Fe"] };
  assert.equal(gradeAnswer(typed, { correct: false, elapsedMs: 2_000 }), Rating.Again);
});
