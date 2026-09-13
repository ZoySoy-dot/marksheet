/**
 * Contract tests for writing the format back out.
 * The builder is only safe if parse and serialize are true inverses.
 * Run with: npm test
 */
import assert from "node:assert/strict";
import test from "node:test";
import { parseSheet } from "../src/lib/parse.ts";
import { countComments, serializeSheet } from "../src/lib/serialize.ts";

test("writes a single-answer question", () => {
  const text = serializeSheet([
    {
      text: "Capital of France?",
      options: [
        { text: "London", correct: false },
        { text: "Paris", correct: true },
      ],
    },
  ]);
  assert.equal(text, "Q: Capital of France?\n- London\n* Paris\n");
});

test("writes notes as > lines", () => {
  const text = serializeSheet([
    {
      text: "Why?",
      note: "Because.",
      options: [
        { text: "yes", correct: true },
        { text: "no", correct: false },
      ],
    },
  ]);
  assert.match(text, /^> Because\.$/m);
});

test("an explanation can run to several lines", () => {
  const text = serializeSheet([
    {
      text: "Why layer 3?",
      note: "Routers forward on IP.\nLayer 2 is the switch's job.\nAsk whether it crosses networks.",
      options: [
        { text: "Layer 3", correct: true },
        { text: "Layer 2", correct: false },
      ],
    },
  ]);
  assert.ok(text.includes("> Routers forward on IP.\n"));
  assert.ok(text.includes("> Layer 2 is the switch's job.\n"));
  assert.ok(text.includes("> Ask whether it crosses networks."));

  // and it survives the trip back
  const again = parseSheet(text);
  assert.equal(again.problems.length, 0);
  assert.equal(
    again.questions[0].note,
    "Routers forward on IP.\nLayer 2 is the switch's job.\nAsk whether it crosses networks.",
  );
});

test("blank lines inside an explanation are dropped, not written as empty notes", () => {
  const text = serializeSheet([
    {
      text: "Spaced out?",
      note: "First.\n\n  \nSecond.",
      options: [
        { text: "yes", correct: true },
        { text: "no", correct: false },
      ],
    },
  ]);
  assert.equal(text.match(/^> /gm)?.length, 2);
  assert.equal(parseSheet(text).questions[0].note, "First.\nSecond.");
});

test("separates questions with a blank line", () => {
  const text = serializeSheet([
    { text: "One", options: [{ text: "a", correct: true }, { text: "b", correct: false }] },
    { text: "Two", options: [{ text: "c", correct: true }, { text: "d", correct: false }] },
  ]);
  assert.ok(text.includes("* a\n- b\n\nQ: Two"));
});

test("skips a card the author never touched", () => {
  const text = serializeSheet([
    { text: "  ", note: "", options: [{ text: "", correct: true }, { text: " ", correct: false }] },
  ]);
  assert.equal(text, "");
});

test("skips half-typed answer rows but keeps the question", () => {
  const text = serializeSheet([
    {
      text: "Real question",
      options: [
        { text: "kept", correct: true },
        { text: "", correct: false },
        { text: "also kept", correct: false },
      ],
    },
  ]);
  assert.equal(text, "Q: Real question\n* kept\n- also kept\n");
});

test("round trips a sheet through parse and back unchanged", () => {
  const original = [
    "Q: Which layer does a router work at?",
    "- Layer 2",
    "* Layer 3",
    "> Routers forward on IP addresses.",
    "",
    "Q: Which are prime?",
    "* 2",
    "- 4",
    "* 7",
  ].join("\n");

  const first = parseSheet(original);
  const rewritten = serializeSheet(first.questions);
  const second = parseSheet(rewritten);

  assert.equal(second.problems.length, 0);
  assert.deepEqual(
    second.questions.map((q) => ({
      text: q.text,
      multi: q.multi,
      note: q.note,
      options: q.options.map((o) => [o.text, o.correct]),
    })),
    first.questions.map((q) => ({
      text: q.text,
      multi: q.multi,
      note: q.note,
      options: q.options.map((o) => [o.text, o.correct]),
    })),
  );
});

test("round trip preserves LaTeX untouched", () => {
  const original = String.raw`Q: Evaluate $$\int_0^1 3x^2 \, dx$$
* $1$
- $\frac{1}{3}$
> The antiderivative is $x^3$.`;
  const again = parseSheet(serializeSheet(parseSheet(original).questions));
  assert.equal(again.problems.length, 0);
  assert.equal(again.questions[0].text, String.raw`Evaluate $$\int_0^1 3x^2 \, dx$$`);
  assert.equal(again.questions[0].options[1].text, String.raw`$\frac{1}{3}$`);
  assert.equal(again.questions[0].note, "The antiderivative is $x^3$.");
});

test("round trip keeps pick-all-that-apply", () => {
  const again = parseSheet(serializeSheet(parseSheet("Q: Primes?\n* 2\n- 4\n* 7").questions));
  assert.equal(again.questions[0].multi, true);
});

test("a question with no text still writes, so the readout can flag it", () => {
  const text = serializeSheet([
    { text: "", options: [{ text: "an answer", correct: true }, { text: "b", correct: false }] },
  ]);
  assert.ok(text.startsWith("Q: \n"));
  assert.equal(parseSheet(text).problems.length, 1);
});

test("counts comment lines that the builder cannot hold", () => {
  assert.equal(countComments("# one\nQ: a\n* b\n  # two\n- c"), 2);
  assert.equal(countComments("Q: a\n* b\n- c"), 0);
});
