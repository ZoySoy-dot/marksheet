/**
 * Reading a question bank that already exists.
 *
 * This is deliberately not the same job as /ai, which hands a chatbot your
 * lecture notes and asks it to invent questions. Here the questions are
 * already written, by a lecturer or a review centre, and sitting in a PDF.
 * The model is transcribing, not composing, which is a far smaller thing to
 * trust it with: it does not have to be right about pharmacology, it only has
 * to read.
 *
 * The one genuinely hard part is that real bank documents keep the answer key
 * somewhere else, usually a table at the back. Matching "17. C" on page 40 to
 * the seventeenth question on page 6 is the whole reason this runs a model
 * over the document rather than a parser.
 *
 * The model never writes Sagot format. It returns objects, serializeSheet
 * writes the format, and parseSheet still has to accept the result before
 * anything can be published. A malformed sheet is therefore not possible here,
 * only a wrong one, which is what the review step in the editor is for.
 */

import { z } from "zod";
import { google } from "@ai-sdk/google";
import type { SerializableQuestion } from "@/lib/serialize";

// Relative, not aliased: the contract tests run this file through node
// directly, where "@/" means nothing. A type-only import is erased before it
// matters, but a re-export is real and has to resolve.
export { COUNTS, MODES, isMode, type ImportMode } from "./importModes.ts";

/** Long enough for a past paper, short enough that one bad read stays cheap. */
export const MAX_QUESTIONS = 120;

/**
 * Every field is required and may be empty. Optional fields are the usual way
 * to say this, but strict structured output support for them varies by
 * provider, and an empty array costs nothing to normalise away afterwards.
 */
const ImportedOption = z.object({
  text: z.string().describe("The answer exactly as the document words it."),
  correct: z.boolean().describe("True only if the document says so."),
});

const ImportedQuestion = z.object({
  text: z.string().describe("The question exactly as the document words it."),
  options: z
    .array(ImportedOption)
    .describe("The choices offered. Empty only when the question is a typed one."),
  accept: z
    .array(z.string())
    .describe(
      "Accepted answers for a question with no choices, one per accepted wording. Empty otherwise.",
    ),
  note: z
    .array(z.string())
    .describe(
      "The explanation, one point per entry, each shown on its own line. Empty if there is none.",
    ),
});

export const ImportedSheet = z.object({
  title: z.string().describe("A title for the sheet, taken from the document."),
  questions: z.array(ImportedQuestion),
});

export type ImportedSheet = z.infer<typeof ImportedSheet>;

/**
 * The instruction that separates this from generation. Every rule here exists
 * to make the model decline rather than invent, because a bank that drills a
 * made-up answer is worse than a bank that is twenty questions short.
 */
export const IMPORT_BRIEF = `You are transcribing an existing question bank into a structured form.

The questions in this document were written by someone else and are already correct. Your job is to read them out accurately. You are not writing a quiz.

WHAT TO EXTRACT

- Every question the document actually contains, in the order it contains them.
- The answer choices as written, with the correct one marked.
- Any explanation, rationale or worked solution the document gives, as the note.
- A title, taken from the document's own heading or subject.

THE ANSWER KEY

The correct answers are often not next to the questions. Look for an answer key, a solutions table, an appendix, or a bolded or underlined choice. Match keys to questions by their number.

If the key says "17. C", find question 17 and mark its third choice correct.

WHAT NOT TO DO

- Do not invent questions. If the document holds twelve, return twelve.
- Do not invent choices. If a question offers three, return three.
- Do not invent explanations. An absent rationale is an empty note, not a guess.
- Do not guess a correct answer. If you cannot find the key for a question, and the document does not mark the answer, leave that question out of the results entirely. A missing question costs nothing. A wrongly keyed one teaches the wrong thing.
- Do not fix, improve or reword the questions. Transcribe them, including their awkward phrasing.
- Do not renumber. Drop any leading "1." or "Q1." from the question text, since the numbering is added back on display.

SHAPE

- Mark exactly one choice correct for an ordinary question.
- Mark several correct only where the document genuinely says to pick all that apply.
- Where the document asks for a written answer rather than a choice, leave options empty and put the accepted answers in accept, one entry per wording the key allows. Otherwise leave accept empty.
- A question has either choices or accepted answers, never both.

MATHS

Write any mathematics as LaTeX between single dollar signs, so x squared is $x^2$ and a fraction is $\frac{1}{2}$. Keep each expression on one line. Write a literal dollar sign as \$.

Return at most ${MAX_QUESTIONS} questions. If the document holds more, take the first ${MAX_QUESTIONS} and stop.`;

/**
 * Drops what the model was allowed to leave empty, and anything that came back
 * too broken to be a question. A choice question needs at least two answers and
 * at least one of each kind, which is the same bar parseSheet sets, applied
 * here so a half-read question is discarded rather than published as a puzzle.
 */
export function toSerializable(sheet: ImportedSheet): SerializableQuestion[] {
  const out: SerializableQuestion[] = [];

  for (const question of sheet.questions.slice(0, MAX_QUESTIONS)) {
    const text = question.text.trim();
    if (!text) continue;

    const accept = question.accept.map((answer) => answer.trim()).filter(Boolean);
    // One entry per line, which is how serializeSheet writes a repeated "> ".
    // Asking for an array rather than a string is what stops a model returning
    // a single paragraph where the format wants several separate points.
    const note = question.note
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n");

    if (accept.length > 0) {
      out.push({ text, options: [], accept, ...(note ? { note } : {}) });
      continue;
    }

    const options = question.options
      .map((option) => ({ text: option.text.trim(), correct: option.correct }))
      .filter((option) => option.text);

    const right = options.filter((option) => option.correct).length;
    if (options.length < 2 || right === 0 || right === options.length) continue;

    out.push({ text, options, ...(note ? { note } : {}) });
  }

  return out;
}

/**
 * The other job a document can be given.
 *
 * Reading a paper and writing questions about one are different enough to need
 * different instructions, and dangerous in different ways. Transcribing risks
 * mis-keying a question; composing risks inventing a fact. The rules below are
 * the ones already proven in aiPrompt.ts, which is the brief handed to a
 * chatbot for the same job, minus everything about the text format, since
 * nothing here writes the format.
 */
export function writeBrief(count: number): string {
  const howMany =
    count > 0
      ? `Write ${count} questions.`
      : "Write as many questions as the material genuinely supports, and stop there.";

  return `You are turning someone's study material into a quiz.

The document is notes, slides, a textbook chapter or a reviewer. It does not contain questions. You are writing them.

WHAT TO WRITE

- ${howMany}
- Test the material in this document, not general knowledge around it. Every answer must be checkable against something the document actually says.
- Do not state anything the document does not support. If you are unsure whether it says something, do not write a question about it.
- If the material is thin in places, skip those rather than padding.

QUESTIONS

- Write wrong answers that are genuinely tempting: common confusions, near-misses, swapped terms, the right idea applied to the wrong case.
- Never write filler choices like "none of the above" or "all of the above".
- Vary which position the correct answer sits in. Do not put it first every time.
- Match the wording and notation the document uses.
- Give each question at least two choices and never more than twenty six.
- Mark exactly one choice correct unless the question genuinely has several, in which case mark each of them and leave at least one wrong.

WRITTEN ANSWERS

- Where recalling the answer is the point and it is short and unambiguous, a term, a number, a formula or a date, leave options empty and put the answer in accept instead.
- Repeat accept for every wording you will take: an abbreviation, a synonym, a second correct form of an expression. Capitals and spacing are already forgiven.
- Nothing is equivalent unless you list it. "$2x$" will not accept "$x+x$" on its own.
- A question has either choices or accepted answers, never both.

EXPLANATIONS

- The note is where the teaching happens, so do not be stingy with it.
- Walk through the working, name the trap the wrong answers set, and give the rule or formula worth memorising.
- The note is a list. Each entry is one point, shown on its own line. Two to five entries is normal for anything with reasoning in it.
- One thing per entry. Do not cram a whole derivation, or a whole paragraph, into one.
- Teach the point directly. Never refer to the source, so no "the document states", no "the text says", no "according to the material". The person reading the explanation cannot see what you read, and being told where a fact came from teaches them nothing.

VARIETY

- Use a written answer, and a pick-all-that-apply question, wherever the material genuinely calls for one. A sheet that is twenty identical pick-one questions tests recognition rather than recall.

MATHS

Write mathematics as LaTeX between single dollar signs, so x squared is $x^2$ and a fraction is $\frac{1}{2}$. Keep each expression on one line. Write a literal dollar sign as \$.

Give the sheet a title taken from the document's subject.

Return at most ${MAX_QUESTIONS} questions.`;
}

/**
 * Which model reads the document, and how it is reached.
 *
 * Cheap, and long enough in the context to hold an answer key printed forty
 * pages from the questions it answers. The newer flash models read a scanned
 * page better but are not on the gateway's free tier, so the default is the
 * one that works before any credits are bought. SAGOT_IMPORT_MODEL moves
 * it up once they are.
 *
 * Two ways to reach it. On Vercel the gateway needs no key at all, since the
 * deployment's OIDC token authenticates it, but the account behind it must
 * have a card on file. A Google AI Studio key has a free tier and no such
 * requirement, so if one is present it is used directly instead.
 */
export const IMPORT_MODEL = process.env.SAGOT_IMPORT_MODEL || "google/gemini-2.5-flash";

export function importModel() {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) return IMPORT_MODEL;
  // Gateway ids carry a provider prefix the provider itself does not want.
  return google(IMPORT_MODEL.replace(/^google\//, ""));
}
