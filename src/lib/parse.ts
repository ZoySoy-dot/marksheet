/**
 * The Sagot format.
 *
 *   Q: What is the capital of France?
 *   - London
 *   - Berlin
 *   * Paris
 *   > Paris has been the capital since 508 AD.
 *
 *   Q: What is the derivative of $x^2$?
 *   = $2x$
 *   > Bring the power down and subtract one from it.
 *
 * Q:  starts a question
 * *   a correct answer
 * -   a wrong answer
 * =   an answer they have to type, repeat for each form you accept
 * >   a note shown after answering (optional, repeatable)
 * #   a line to ignore
 *
 * Two or more answers marked * make the question pick-all-that-apply.
 * A question written with = is typed rather than chosen, and cannot also
 * carry * or - lines.
 */

export type QuizOption = {
  id: string;
  text: string;
  correct: boolean;
};

export type Question = {
  id: string;
  text: string;
  /** Empty on a typed question. */
  options: QuizOption[];
  multi: boolean;
  note?: string;
  /**
   * Absent on every quiz published before typed answers existed, which is why
   * this is optional rather than a "choice" | "typed" pair: the stored JSON of
   * an old quiz stays valid exactly as it is.
   */
  kind?: "typed";
  /** Every spelling of the answer the author will accept. Typed questions. */
  accept?: string[];
};

/** Typed questions are the exception everywhere, so the test reads better. */
export const isTyped = (question: Question): boolean => question.kind === "typed";

export type ParseProblem = {
  line: number;
  message: string;
};

export type ParseResult = {
  questions: Question[];
  problems: ParseProblem[];
  multiCount: number;
};

export const MAX_QUESTIONS = 500;
export const MAX_OPTIONS = 26;

const RE_QUESTION = /^[ \t]*[Qq][ \t]*:[ \t]*(.*?)[ \t]*$/;
const RE_OPTION = /^[ \t]*([*\-])[ \t]*(\S.*?)[ \t]*$/;
const RE_ACCEPT = /^[ \t]*=[ \t]*(\S.*?)[ \t]*$/;
const RE_NOTE = /^[ \t]*>[ \t]*(\S.*?)[ \t]*$/;
const RE_COMMENT = /^[ \t]*#/;
const RE_BLANK = /^[ \t]*$/;
/**
 * Chatbots wrap their answer in a code fence however firmly you ask them not
 * to. Dropping fence lines is friendlier than making someone hunt for the
 * three backticks that broke their paste.
 */
const RE_FENCE = /^[ \t]*(?:```|~~~)[^\n]*$/;

type Draft = {
  line: number;
  text: string;
  options: QuizOption[];
  accepts: string[];
  notes: string[];
};

function quote(text: string): string {
  const clean = text.trim();
  if (!clean) return "that question";
  return clean.length > 44 ? `“${clean.slice(0, 44)}…”` : `“${clean}”`;
}

export function parseSheet(input: string): ParseResult {
  const lines = input.split(/\r\n|\r|\n/);
  const questions: Question[] = [];
  const problems: ParseProblem[] = [];

  let draft: Draft | null = null;
  let truncated = false;

  const closeDraft = () => {
    if (!draft) return;
    const d = draft;
    draft = null;

    if (!d.text) {
      problems.push({ line: d.line, message: "Q: has no question text." });
      return;
    }

    const typed = d.accepts.length > 0;

    if (typed) {
      if (d.options.length > 0) {
        problems.push({
          line: d.line,
          message: `${quote(d.text)} mixes = with * and -. A question is either typed or chosen, not both.`,
        });
        return;
      }
      if (d.accepts.length > MAX_OPTIONS) {
        problems.push({
          line: d.line,
          message: `${quote(d.text)} accepts ${d.accepts.length} answers. The limit is ${MAX_OPTIONS}.`,
        });
        return;
      }

      if (questions.length >= MAX_QUESTIONS) {
        if (!truncated) {
          truncated = true;
          problems.push({
            line: d.line,
            message: `More than ${MAX_QUESTIONS} questions. Split this into a few sheets.`,
          });
        }
        return;
      }

      questions.push({
        id: `q${questions.length}`,
        text: d.text,
        multi: false,
        options: [],
        kind: "typed",
        accept: d.accepts,
        ...(d.notes.length ? { note: d.notes.join("\n") } : {}),
      });
      return;
    }

    if (d.options.length === 0) {
      problems.push({ line: d.line, message: `${quote(d.text)} has no answers.` });
      return;
    }
    if (d.options.length === 1) {
      problems.push({ line: d.line, message: `${quote(d.text)} needs at least two answers.` });
      return;
    }
    if (d.options.length > MAX_OPTIONS) {
      problems.push({
        line: d.line,
        message: `${quote(d.text)} has ${d.options.length} answers. The limit is ${MAX_OPTIONS}.`,
      });
      return;
    }

    const correct = d.options.filter((o) => o.correct).length;
    if (correct === 0) {
      problems.push({
        line: d.line,
        message: `${quote(d.text)} has no answer marked with *.`,
      });
      return;
    }
    if (correct === d.options.length) {
      problems.push({
        line: d.line,
        message: `${quote(d.text)} has every answer marked *. Mark the wrong ones with -.`,
      });
      return;
    }

    if (questions.length >= MAX_QUESTIONS) {
      if (!truncated) {
        truncated = true;
        problems.push({
          line: d.line,
          message: `More than ${MAX_QUESTIONS} questions. Split this into a few sheets.`,
        });
      }
      return;
    }

    const qid = `q${questions.length}`;
    questions.push({
      id: qid,
      text: d.text,
      multi: correct > 1,
      options: d.options.map((o, i) => ({ ...o, id: `${qid}o${i}` })),
      ...(d.notes.length ? { note: d.notes.join("\n") } : {}),
    });
  };

  lines.forEach((raw, i) => {
    const lineNo = i + 1;

    if (RE_BLANK.test(raw) || RE_COMMENT.test(raw) || RE_FENCE.test(raw)) return;

    const q = raw.match(RE_QUESTION);
    if (q) {
      closeDraft();
      draft = { line: lineNo, text: q[1], options: [], accepts: [], notes: [] };
      return;
    }

    const opt = raw.match(RE_OPTION);
    if (opt) {
      if (!draft) {
        problems.push({
          line: lineNo,
          message: "An answer with no question above it. Start the question with Q:.",
        });
        return;
      }
      draft.options.push({ id: "", text: opt[2], correct: opt[1] === "*" });
      return;
    }

    const accept = raw.match(RE_ACCEPT);
    if (accept) {
      if (!draft) {
        problems.push({
          line: lineNo,
          message: "A typed answer with no question above it. Start the question with Q:.",
        });
        return;
      }
      draft.accepts.push(accept[1]);
      return;
    }

    const note = raw.match(RE_NOTE);
    if (note) {
      if (!draft) {
        problems.push({
          line: lineNo,
          message: "A note with no question above it. Start the question with Q:.",
        });
        return;
      }
      draft.notes.push(note[1]);
      return;
    }

    problems.push({
      line: lineNo,
      message: `Not a question, answer, or note. Start questions with Q:, answers with * or -, typed answers with =.`,
    });
  });

  closeDraft();

  return {
    questions,
    problems,
    multiCount: questions.filter((q) => q.multi).length,
  };
}

/** A title guess from the first question, used when the author leaves the title blank. */
export function suggestTitle(questions: Question[]): string {
  const first = questions[0]?.text?.trim();
  if (!first) return "Untitled sheet";
  return first.length > 60 ? `${first.slice(0, 60)}…` : first;
}
