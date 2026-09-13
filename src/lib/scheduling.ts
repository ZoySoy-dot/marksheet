/**
 * Turning an answer into an FSRS rating, without asking the user anything.
 *
 * FSRS expects a self-reported recall grade. We do not have one, so we infer it
 * from correctness and how long the answer took. The catch is that raw response
 * time measures reading speed as much as recall: a long question with an
 * integral in it takes ten seconds to even read, and would be graded Hard for
 * ever, while a four-word question is Easy for free.
 *
 * So the clock that matters starts once you have plausibly finished reading.
 * We estimate that allowance from the length of the question and its answers,
 * subtract it, and grade the thinking time that is left.
 */

import { Rating, type Grade } from "ts-fsrs";

/** Adult silent reading of dense material sits near 200 words per minute. */
const WORDS_PER_MINUTE = 200;
const MS_PER_WORD = 60_000 / WORDS_PER_MINUTE;

/** Moving to the answer and clicking it. Picking several takes longer. */
const SINGLE_PICK_MS = 700;
const MULTI_PICK_MS = 1_800;

export const EASY_UNDER_MS = 3_000;
export const GOOD_UNDER_MS = 10_000;

/** Beyond this much thinking we stop waiting and count it as a lapse. */
export const THINKING_LIMIT_MS = 60_000;

const countWords = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

export type TimingShape = {
  text: string;
  options: { text: string }[];
  multi: boolean;
};

/** How long this question takes to read and answer before any recall happens. */
export function readingAllowanceMs(question: TimingShape): number {
  const words =
    countWords(question.text) +
    question.options.reduce((total, option) => total + countWords(option.text), 0);
  const picking = question.multi ? MULTI_PICK_MS : SINGLE_PICK_MS;
  return Math.round(words * MS_PER_WORD + picking);
}

/** The wall-clock deadline for one question, reading time included. */
export const timeLimitMs = (question: TimingShape) =>
  readingAllowanceMs(question) + THINKING_LIMIT_MS;

export type AnswerTiming = {
  correct: boolean;
  /** Wall clock from the question appearing to the answer being committed. */
  elapsedMs: number;
  timedOut?: boolean;
};

/**
 * Again  wrong, or the timer ran out
 * Hard   right, but slow to recall
 * Good   right, at a normal pace
 * Easy   right, almost immediately
 */
export function gradeAnswer(question: TimingShape, timing: AnswerTiming): Grade {
  if (timing.timedOut || !timing.correct) return Rating.Again;

  const thinking = Math.max(0, timing.elapsedMs - readingAllowanceMs(question));
  if (thinking < EASY_UNDER_MS) return Rating.Easy;
  if (thinking <= GOOD_UNDER_MS) return Rating.Good;
  return Rating.Hard;
}

export const GRADE_NAMES: Record<Grade, string> = {
  [Rating.Again]: "Again",
  [Rating.Hard]: "Hard",
  [Rating.Good]: "Good",
  [Rating.Easy]: "Easy",
};
