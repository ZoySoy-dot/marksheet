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
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

export async function getQuizBySlug(slug: string): Promise<QuizRecord | null> {
  if (!SLUG_PATTERN.test(slug)) return null;
  const sql = getSql();
  const rows = (await sql`
    select id, slug, title, source, questions, question_count, created_at, updated_at
    from quizzes
    where slug = ${slug}
    limit 1
  `) as Row[];
  return rows[0] ? toRecord(rows[0]) : null;
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
