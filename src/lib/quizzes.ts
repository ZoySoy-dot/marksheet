import { getSql } from "@/lib/db";
import { SLUG_PATTERN } from "@/lib/ids";
import type { Question } from "@/lib/parse";

export type QuizRecord = {
  id: number;
  slug: string;
  title: string;
  source: string;
  questions: Question[];
  questionCount: number;
  /** Google account id, or null for a quiz published without signing in. */
  ownerId: string | null;
  ownerName: string | null;
  ownerImage: string | null;
  createdAt: string;
  updatedAt: string;
};

type Row = {
  id: number;
  slug: string;
  title: string;
  source: string;
  questions: Question[];
  question_count: number;
  owner_id: string | null;
  owner_name: string | null;
  owner_image: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

const asIso = (value: string | Date) =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

function toRecord(row: Row): QuizRecord {
  return {
    id: Number(row.id),
    slug: row.slug,
    title: row.title,
    source: row.source,
    questions: row.questions,
    questionCount: Number(row.question_count),
    ownerId: row.owner_id ?? null,
    ownerName: row.owner_name?.trim() || null,
    ownerImage: row.owner_image?.trim() || null,
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

export async function getQuizBySlug(slug: string): Promise<QuizRecord | null> {
  if (!SLUG_PATTERN.test(slug)) return null;
  const sql = getSql();
  const rows = (await sql`
    select id, slug, title, source, questions, question_count,
           owner_id, owner_name, owner_image, created_at, updated_at
    from quizzes
    where slug = ${slug}
    limit 1
  `) as Row[];
  return rows[0] ? toRecord(rows[0]) : null;
}

export type OwnedSheet = {
  slug: string;
  title: string;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
  attempts: number;
};

/** The signed-in author's own sheets, newest first. Follows them across devices. */
export async function listSheetsByOwner(ownerId: string): Promise<OwnedSheet[]> {
  const sql = getSql();
  const rows = (await sql`
    select q.slug,
           q.title,
           q.question_count,
           q.created_at,
           q.updated_at,
           (select count(*) from attempts a where a.quiz_id = q.id)::int as attempts
    from quizzes q
    where q.owner_id = ${ownerId}
    order by q.created_at desc
    limit 500
  `) as (Row & { attempts: number })[];

  return rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    questionCount: Number(row.question_count),
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
    attempts: Number(row.attempts ?? 0),
  }));
}

export type QuizStats = { attempts: number; averagePercent: number };

export async function getQuizStats(quizId: number): Promise<QuizStats> {
  const sql = getSql();
  const rows = (await sql`
    select
      count(*)::int as attempts,
      coalesce(round(avg(score::numeric / nullif(total, 0)) * 100), 0)::int as average_percent
    from attempts
    where quiz_id = ${quizId}
  `) as { attempts: number; average_percent: number }[];
  const row = rows[0];
  return {
    attempts: Number(row?.attempts ?? 0),
    averagePercent: Number(row?.average_percent ?? 0),
  };
}

export type LeaderboardEntry = {
  userId: string;
  name: string;
  image: string | null;
  points: number;
  score: number;
  total: number;
  durationMs: number | null;
  takenAt: string;
};

/**
 * Best run per person, best first. Anyone who took the sheet without an
 * account is excluded: they still get a score, they just have no name to show.
 */
export async function getLeaderboard(quizId: number, limit = 10): Promise<LeaderboardEntry[]> {
  const sql = getSql();
  const rows = (await sql`
    select user_id, display_name, image_url, points, score, total, duration_ms, created_at
    from (
      select distinct on (user_id)
        user_id, display_name, image_url, points, score, total, duration_ms, created_at
      from attempts
      where quiz_id = ${quizId} and user_id is not null
      order by user_id, points desc, duration_ms asc nulls last
    ) best
    order by points desc, duration_ms asc nulls last
    limit ${limit}
  `) as {
    user_id: string;
    display_name: string | null;
    image_url: string | null;
    points: number;
    score: number;
    total: number;
    duration_ms: number | null;
    created_at: string | Date;
  }[];

  return rows.map((row) => ({
    userId: row.user_id,
    name: row.display_name?.trim() || "Anonymous",
    image: row.image_url?.trim() || null,
    points: Number(row.points ?? 0),
    score: Number(row.score ?? 0),
    total: Number(row.total ?? 0),
    durationMs: row.duration_ms === null ? null : Number(row.duration_ms),
    takenAt: asIso(row.created_at),
  }));
}

export type SavedSheetRow = {
  slug: string;
  title: string;
  questionCount: number;
  savedAt: string;
  mine: boolean;
};

/** Sheets kept in someone's library, including ones they did not write. */
export async function listSavedByUser(userId: string, limit = 200): Promise<SavedSheetRow[]> {
  const sql = getSql();
  const rows = (await sql`
    select q.slug, q.title, q.question_count, s.saved_at, q.owner_id
    from saved_quizzes s
    join quizzes q on q.id = s.quiz_id
    where s.user_id = ${userId}
    order by s.saved_at desc
    limit ${limit}
  `) as {
    slug: string;
    title: string;
    question_count: number;
    saved_at: string | Date;
    owner_id: string | null;
  }[];

  return rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    questionCount: Number(row.question_count),
    savedAt: asIso(row.saved_at),
    mine: row.owner_id === userId,
  }));
}

export async function isSaved(userId: string, quizId: number): Promise<boolean> {
  const sql = getSql();
  const rows = (await sql`
    select 1 as hit from saved_quizzes
    where user_id = ${userId} and quiz_id = ${quizId}
    limit 1
  `) as { hit: number }[];
  return rows.length > 0;
}

export type ActiveRunner = {
  userId: string;
  name: string;
  image: string | null;
  position: number;
  total: number;
  startedAt: string;
};

/** Anyone whose drill has checked in recently and has not finished it. */
export async function getActiveRunners(quizId: number, withinSeconds = 90): Promise<ActiveRunner[]> {
  const sql = getSql();
  const rows = (await sql`
    select user_id, display_name, image_url, position,
           coalesce(array_length(order_keys, 1), 0) as total, started_at
    from runs
    where quiz_id = ${quizId}
      and finished_at is null
      and last_seen_at > now() - make_interval(secs => ${withinSeconds})
    order by started_at asc
    limit 20
  `) as {
    user_id: string;
    display_name: string | null;
    image_url: string | null;
    position: number;
    total: number;
    started_at: string | Date;
  }[];

  return rows.map((row) => ({
    userId: row.user_id,
    name: row.display_name?.trim() || "Someone",
    image: row.image_url?.trim() || null,
    position: Number(row.position ?? 0),
    total: Number(row.total ?? 0),
    startedAt: asIso(row.started_at),
  }));
}

export type SavedRun = {
  orderKeys: string[];
  picks: Record<string, number[]>;
  /** Answers they typed, for questions that are written rather than chosen. */
  written: Record<string, string>;
  revealed: Record<string, boolean>;
  timings: Record<string, number>;
  position: number;
  mode: "reviewer" | "test";
  startedAt: string;
};

/** The unfinished run to offer back, if there is one. */
export async function getRunFor(userId: string, quizId: number): Promise<SavedRun | null> {
  const sql = getSql();
  const rows = (await sql`
    select order_keys, picks, written, revealed, timings, position, mode, started_at
    from runs
    where user_id = ${userId} and quiz_id = ${quizId} and finished_at is null
    limit 1
  `) as {
    order_keys: string[] | null;
    picks: Record<string, number[]> | null;
    written: Record<string, string> | null;
    revealed: Record<string, boolean> | null;
    timings: Record<string, number> | null;
    position: number;
    mode: string;
    started_at: string | Date;
  }[];

  const row = rows[0];
  if (!row) return null;
  const orderKeys = row.order_keys ?? [];
  if (orderKeys.length === 0) return null;

  return {
    orderKeys,
    picks: row.picks ?? {},
    written: row.written ?? {},
    revealed: row.revealed ?? {},
    timings: row.timings ?? {},
    position: Number(row.position ?? 0),
    mode: row.mode === "test" ? "test" : "reviewer",
    startedAt: asIso(row.started_at),
  };
}

export type RunRecord = {
  score: number;
  total: number;
  points: number;
  durationMs: number | null;
  takenAt: string;
};

/** Your own runs on one quiz, newest first. */
export async function listRunsFor(
  userId: string,
  quizId: number,
  limit = 12,
): Promise<RunRecord[]> {
  const sql = getSql();
  const rows = (await sql`
    select score, total, points, duration_ms, created_at
    from attempts
    where user_id = ${userId} and quiz_id = ${quizId}
    order by created_at desc
    limit ${limit}
  `) as {
    score: number;
    total: number;
    points: number;
    duration_ms: number | null;
    created_at: string | Date;
  }[];

  return rows.map((row) => ({
    score: Number(row.score ?? 0),
    total: Number(row.total ?? 0),
    points: Number(row.points ?? 0),
    durationMs: row.duration_ms === null ? null : Number(row.duration_ms),
    takenAt: asIso(row.created_at),
  }));
}

export type TroubleSpot = {
  cardKey: string;
  wrong: number;
  seen: number;
};

/**
 * The questions you keep getting wrong, worst first.
 *
 * review_log already holds one row per question per answer, so this is a
 * count rather than anything new to record.
 */
export async function listTroubleSpots(
  userId: string,
  quizId: number,
  limit = 5,
): Promise<TroubleSpot[]> {
  const sql = getSql();
  const rows = (await sql`
    select c.card_key,
           count(*) filter (where rl.correct is false)::int as wrong,
           count(*)::int as seen
    from review_log rl
    join cards c on c.id = rl.card_id
    where c.user_id = ${userId} and c.quiz_id = ${quizId}
    group by c.card_key
    having count(*) filter (where rl.correct is false) > 0
    order by wrong desc, seen desc
    limit ${limit}
  `) as { card_key: string; wrong: number; seen: number }[];

  return rows.map((row) => ({
    cardKey: row.card_key,
    wrong: Number(row.wrong ?? 0),
    seen: Number(row.seen ?? 0),
  }));
}

/** Everyone who has finished this quiz with an account, however they placed. */
export async function countPlayers(quizId: number): Promise<number> {
  const sql = getSql();
  const rows = (await sql`
    select count(distinct user_id)::int as players
    from attempts
    where quiz_id = ${quizId} and user_id is not null
  `) as { players: number }[];
  return Number(rows[0]?.players ?? 0);
}
