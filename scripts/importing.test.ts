import { deepStrictEqual, strictEqual } from "node:assert/strict";
import { test } from "node:test";
import { toSerializable, type ImportedSheet } from "../src/lib/importing.ts";
import { serializeSheet } from "../src/lib/serialize.ts";
import { parseSheet } from "../src/lib/parse.ts";

const sheet = (questions: ImportedSheet["questions"]): ImportedSheet => ({
  title: "Practice Set 3",
  questions,
});

const choice = (
  text: string,
  options: [string, boolean][],
  note: string[] = [],
): ImportedSheet["questions"][number] => ({
  text,
  options: options.map(([t, correct]) => ({ text: t, correct })),
  accept: [],
  note,
});

test("a keyed choice question survives into the format", () => {
  const questions = toSerializable(
    sheet([choice("Specific weight of water?", [["9.81 kN/m3", true], ["1000 kN/m3", false]], ["It is a weight, not a density."])]),
  );
  const source = serializeSheet(questions);

  strictEqual(
    source,
    "Q: Specific weight of water?\n* 9.81 kN/m3\n- 1000 kN/m3\n> It is a weight, not a density.\n",
  );
  strictEqual(parseSheet(source).problems.length, 0);
});

test("a question the key never answered is dropped, not guessed", () => {
  const questions = toSerializable(
    sheet([choice("Unkeyed question?", [["A", false], ["B", false], ["C", false]])]),
  );
  deepStrictEqual(questions, []);
});

test("a question marked correct throughout is dropped too", () => {
  const questions = toSerializable(
    sheet([choice("Everything right?", [["A", true], ["B", true]])]),
  );
  deepStrictEqual(questions, []);
});

test("a lone choice is not a question", () => {
  const questions = toSerializable(sheet([choice("Only one?", [["A", true]])]));
  deepStrictEqual(questions, []);
});

test("several correct answers stay pick-all-that-apply", () => {
  const source = serializeSheet(
    toSerializable(
      sheet([
        choice("Which are dimensionless?", [
          ["Reynolds number", true],
          ["Froude number", true],
          ["Kinematic viscosity", false],
        ]),
      ]),
    ),
  );
  const parsed = parseSheet(source);
  strictEqual(parsed.problems.length, 0);
  strictEqual(parsed.multiCount, 1);
});

test("a written answer becomes a typed question and keeps every wording", () => {
  const questions = toSerializable(
    sheet([
      {
        text: "Hydrostatic force on a vertical plane surface?",
        options: [],
        accept: ["$F = \gamma \bar{h} A$", "gamma h-bar A"],
        note: [],
      },
    ]),
  );
  const source = serializeSheet(questions);
  const parsed = parseSheet(source);

  strictEqual(parsed.problems.length, 0);
  strictEqual(parsed.questions[0].kind, "typed");
  deepStrictEqual(parsed.questions[0].accept, ["$F = \gamma \bar{h} A$", "gamma h-bar A"]);
});

test("blank fields the model was allowed to return are cleaned away", () => {
  const questions = toSerializable(
    sheet([choice("  Padded?  ", [["  A  ", true], ["", false], ["B", false]], ["   "])]),
  );

  strictEqual(questions[0].text, "Padded?");
  strictEqual(questions[0].note, undefined);
  deepStrictEqual(
    questions[0].options.map((o) => o.text),
    ["A", "B"],
  );
});

test("more questions than the cap are not returned", () => {
  const many = Array.from({ length: 140 }, (_, i) =>
    choice(`Question ${i}?`, [["A", true], ["B", false]]),
  );
  strictEqual(toSerializable(sheet(many)).length, 120);
});
