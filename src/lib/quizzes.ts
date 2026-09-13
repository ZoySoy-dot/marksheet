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
  /** Clerk user id, or null for a sheet published without an account. */
  ownerId: string | null;
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
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

export async function getQuizBySlug(slug: string): Promise<QuizRecord | null> {
  if (!SLUG_PATTERN.test(slug)) return null;
  const sql = getSql();
  const rows = (await sql`
    select id, slug, title, source, questions, question_count, owner_id, created_at, updated_at
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
