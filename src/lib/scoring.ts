/**
 * Points for a run.
 *
 * The grade FSRS already computed does double duty here, so there is only one
 * notion of "how did that go" in the app. Being right is worth far more than
 * being quick: the slowest correct answer still scores 100, while speed tops
 * out at a 50 point bonus. A wrong answer scores nothing, so no amount of
 * fast guessing beats knowing the material.
 */

import { Rating, type Grade } from "ts-fsrs";

export const POINTS: Record<Grade, number> = {
  [Rating.Again]: 0,
  [Rating.Hard]: 100,
  [Rating.Good]: 125,
  [Rating.Easy]: 150,
};

export const MAX_POINTS_PER_QUESTION = POINTS[Rating.Easy];

export const pointsForGrade = (grade: Grade): number => POINTS[grade] ?? 0;

export const perfectScore = (questionCount: number) =>
  questionCount * MAX_POINTS_PER_QUESTION;

/** 0 to 100, for a progress bar or a percentage next to the raw points. */
export function scorePercent(points: number, questionCount: number): number {
  const best = perfectScore(questionCount);
  if (best <= 0) return 0;
  return Math.round((points / best) * 100);
}

export type LeaderboardRow = {
  userId: string;
  name: string;
  points: number;
  score: number;
  total: number;
  durationMs: number | null;
  takenAt: string;
};

/** mm:ss, or h:mm:ss once a run gets silly. */
export function formatDuration(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return "—";
  const totalSeconds = Math.round(ms / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}
