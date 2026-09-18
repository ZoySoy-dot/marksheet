/**
 * Contract tests for the Sagot format.
 * Run with: npm test
 */
import assert from "node:assert/strict";
import test from "node:test";
import { parseSheet, suggestTitle } from "../src/lib/parse.ts";

test("reads a single-answer question", () => {
  const { questions, problems } = parseSheet("Q: Capital of France?\n- London\n- Berlin\n* Paris");
  assert.equal(problems.length, 0);
  assert.equal(questions.length, 1);
  assert.equal(questions[0].text, "Capital of France?");
  assert.equal(questions[0].multi, false);
  assert.deepEqual(
    questions[0].options.map((o) => [o.text, o.correct]),
    [["London", false], ["Berlin", false], ["Paris", true]],
  );
});

test("two correct answers make it pick-all-that-apply", () => {
  const { questions, multiCount } = parseSheet("Q: Primes?\n* 2\n- 4\n* 7\n- 9");
  assert.equal(questions[0].multi, true);
  assert.equal(multiCount, 1);
});

test("option ids are unique across the sheet", () => {
  const { questions } = parseSheet("Q: One\n* a\n- b\n\nQ: Two\n* a\n- b");
  const ids = questions.flatMap((q) => q.options.map((o) => o.id));
  assert.equal(new Set(ids).size, ids.length);
});

test("collects notes, joining repeats", () => {
  const { questions } = parseSheet("Q: Why?\n* yes\n- no\n> First line.\n> Second line.");
  assert.equal(questions[0].note, "First line.\nSecond line.");
});

test("ignores comments, blank lines, and stray indentation", () => {
  const source = "# a comment\n\n   Q: Spaced?\n\t* yes\n   -  no\n\n# trailing comment";
  const { questions, problems } = parseSheet(source);
  assert.equal(problems.length, 0);
  assert.equal(questions.length, 1);
  assert.equal(questions[0].text, "Spaced?");
  assert.deepEqual(questions[0].options.map((o) => o.text), ["yes", "no"]);
});

test("accepts a lowercase q:", () => {
  const { questions, problems } = parseSheet("q: Lowercase?\n* yes\n- no");
  assert.equal(problems.length, 0);
  assert.equal(questions.length, 1);
});

test("flags an answer with no question above it, by line", () => {
  const { questions, problems } = parseSheet("* orphan\n- also orphan");
  assert.equal(questions.length, 0);
  assert.equal(problems.length, 2);
  assert.equal(problems[0].line, 1);
  assert.match(problems[0].message, /no question above it/);
});

test("flags a question with nothing marked correct", () => {
  const { questions, problems } = parseSheet("Q: Broken?\n- a\n- b");
  assert.equal(questions.length, 0);
  assert.equal(problems.length, 1);
  assert.equal(problems[0].line, 1);
  assert.match(problems[0].message, /no answer marked with \*/);
});

test("flags a question with every answer marked correct", () => {
  const { problems } = parseSheet("Q: Broken?\n* a\n* b");
  assert.equal(problems.length, 1);
  assert.match(problems[0].message, /every answer marked/);
});

test("flags a question with fewer than two answers", () => {
  const { problems } = parseSheet("Q: Lonely?\n* only one");
  assert.equal(problems.length, 1);
  assert.match(problems[0].message, /at least two answers/);
});

test("flags a question with no answers at all", () => {
  const { problems } = parseSheet("Q: Empty?\n\nQ: Fine?\n* a\n- b");
  assert.equal(problems.length, 1);
  assert.match(problems[0].message, /has no answers/);
});

test("flags Q: with no question text", () => {
  const { problems } = parseSheet("Q:\n* a\n- b");
  assert.equal(problems.length, 1);
  assert.match(problems[0].message, /no question text/);
});

test("flags a line that is not a question, answer, or note", () => {
  const { problems } = parseSheet("Q: Fine?\n* a\n- b\nwhat is this line");
  assert.equal(problems.length, 1);
  assert.equal(problems[0].line, 4);
});

test("keeps the good questions when a later one is broken", () => {
  const { questions, problems } = parseSheet("Q: Good?\n* a\n- b\n\nQ: Bad?\n- a\n- b");
  assert.equal(questions.length, 1);
  assert.equal(questions[0].text, "Good?");
  assert.equal(problems.length, 1);
  assert.equal(problems[0].line, 5);
});

test("handles CRLF line endings", () => {
  const { questions, problems } = parseSheet("Q: Windows?\r\n* yes\r\n- no");
  assert.equal(problems.length, 0);
  assert.equal(questions[0].options.length, 2);
});

test("an empty sheet has no questions and no problems", () => {
  const { questions, problems } = parseSheet("   \n\n# nothing here\n");
  assert.equal(questions.length, 0);
  assert.equal(problems.length, 0);
});

test("ignores the code fences a chatbot wraps its answer in", () => {
  const source = "```\nQ: Fenced?\n* yes\n- no\n```";
  const { questions, problems } = parseSheet(source);
  assert.equal(problems.length, 0);
  assert.equal(questions.length, 1);
  assert.equal(questions[0].text, "Fenced?");
});

test("ignores a labelled code fence too", () => {
  const { problems, questions } = parseSheet("```text\nQ: Fenced?\n* yes\n- no\n```");
  assert.equal(problems.length, 0);
  assert.equal(questions.length, 1);
});

test("suggests a title from the first question", () => {
  const { questions } = parseSheet("Q: What is the capital of France?\n* Paris\n- Berlin");
  assert.equal(suggestTitle(questions), "What is the capital of France?");
  assert.equal(suggestTitle([]), "Untitled sheet");
});

test("reads a typed question", () => {
  const { questions, problems } = parseSheet("Q: Capital of France?\n= Paris\n= City of Paris");
  assert.equal(problems.length, 0);
  assert.equal(questions.length, 1);
  assert.equal(questions[0].kind, "typed");
  assert.equal(questions[0].multi, false);
  assert.deepEqual(questions[0].options, []);
  assert.deepEqual(questions[0].accept, ["Paris", "City of Paris"]);
});

test("a typed question keeps its explanation", () => {
  const { questions } = parseSheet("Q: 2 + 2?\n= 4\n> Add them.\n> Twice.");
  assert.equal(questions[0].note, "Add them.\nTwice.");
});

test("a chosen question has no kind", () => {
  const { questions } = parseSheet("Q: One\n* a\n- b");
  assert.equal(questions[0].kind, undefined);
  assert.equal(questions[0].accept, undefined);
});

test("a question cannot be typed and chosen at once", () => {
  const { questions, problems } = parseSheet("Q: Capital?\n= Paris\n* Paris\n- London");
  assert.equal(questions.length, 0);
  assert.equal(problems.length, 1);
  assert.match(problems[0].message, /mixes/);
});

test("one accepted answer is enough", () => {
  const { questions, problems } = parseSheet("Q: 2 + 2?\n= 4");
  assert.equal(problems.length, 0);
  assert.equal(questions[0].accept?.length, 1);
});

test("a typed answer needs a question above it", () => {
  const { problems } = parseSheet("= Paris");
  assert.equal(problems.length, 1);
  assert.match(problems[0].message, /no question above/);
});

test("typed and chosen questions mix freely in one sheet", () => {
  const { questions, problems } = parseSheet("Q: One\n* a\n- b\n\nQ: Two\n= 42");
  assert.equal(problems.length, 0);
  assert.equal(questions.length, 2);
  assert.equal(questions[0].kind, undefined);
  assert.equal(questions[1].kind, "typed");
});

test("LaTeX survives a typed answer", () => {
  const { questions } = parseSheet("Q: Derivative of $x^2$?\n= $2x$");
  assert.deepEqual(questions[0].accept, ["$2x$"]);
});
