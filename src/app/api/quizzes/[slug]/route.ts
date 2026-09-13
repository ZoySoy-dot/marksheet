import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { apiError, tokensMatch } from "@/lib/api";
import { getSql } from "@/lib/db";
import { SLUG_PATTERN } from "@/lib/ids";
import { parseSheet, suggestTitle } from "@/lib/parse";
import { getQuizBySlug } from "@/lib/quizzes";
import { findTexProblems } from "@/lib/tex";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SOURCE = 200_000;
const MAX_TITLE = 140;

type Context = { params: Promise<{ slug: string }> };
type OwnerRow = { id: number; edit_token: string; owner_id: string | null };

const missing = () => NextResponse.json({ error: "No sheet with that link." }, { status: 404 });
const forbidden = () =>
  NextResponse.json({ error: "That sheet belongs to someone else." }, { status: 403 });

/**
 * Two ways in: you are signed in as the owner, or you hold the edit token.
 * The token still works on an owned sheet, which is what makes an edit link
 * shareable with someone helping you write it.
 */
async function mayEdit(row: OwnerRow, editToken: unknown): Promise<boolean> {
  const { userId } = await auth();
  if (row.owner_id && userId && row.owner_id === userId) return true;
  return tokensMatch(editToken, row.edit_token);
}

async function loadOwnerRow(slug: string): Promise<OwnerRow | undefined> {
  const sql = getSql();
  const rows = (await sql`
    select id, edit_token, owner_id from quizzes where slug = ${slug} limit 1
  `) as OwnerRow[];
  return rows[0];
}

export async function GET(_request: Request, { params }: Context) {
  try {
    const { slug } = await params;
    const quiz = await getQuizBySlug(slug);
    if (!quiz) return missing();

    const { userId } = await auth();

    return NextResponse.json({
      slug: quiz.slug,
      title: quiz.title,
      source: quiz.source,
      questions: quiz.questions,
      questionCount: quiz.questionCount,
      createdAt: quiz.createdAt,
      /** Lets the edit page skip asking for a token when you already own this. */
      isOwner: Boolean(quiz.ownerId && userId && quiz.ownerId === userId),
      hasOwner: Boolean(quiz.ownerId),
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { slug } = await params;
    if (!SLUG_PATTERN.test(slug)) return missing();

    const body = (await request.json()) as {
      editToken?: unknown;
      title?: unknown;
      source?: unknown;
    };
    const source = typeof body.source === "string" ? body.source : "";
    const rawTitle = typeof body.title === "string" ? body.title.trim() : "";

    if (source.length > MAX_SOURCE) {
      return NextResponse.json(
        { error: "That sheet is too big. Split it into a few smaller ones." },
        { status: 413 },
      );
    }

    const row = await loadOwnerRow(slug);
    if (!row) return missing();
    if (!(await mayEdit(row, body.editToken))) return forbidden();

    const parsed = parseSheet(source);
    const questions = parsed.questions;
    const problems = [...parsed.problems, ...findTexProblems(source)].sort((a, b) => a.line - b.line);

    if (questions.length === 0) {
      return NextResponse.json({ error: "This sheet has no questions yet." }, { status: 400 });
    }
    if (problems.length > 0) {
      return NextResponse.json(
        {
          error: `Fix ${problems.length} problem${problems.length === 1 ? "" : "s"} in the sheet first.`,
          problems,
        },
        { status: 400 },
      );
    }

    const title = (rawTitle || suggestTitle(questions)).slice(0, MAX_TITLE);
    const sql = getSql();

    await sql`
      update quizzes
      set title = ${title},
          source = ${source},
          questions = ${JSON.stringify(questions)}::jsonb,
          question_count = ${questions.length},
          updated_at = now()
      where id = ${row.id}
    `;

    return NextResponse.json({ slug, title, questionCount: questions.length });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const { slug } = await params;
    if (!SLUG_PATTERN.test(slug)) return missing();

    const body = (await request.json().catch(() => ({}))) as { editToken?: unknown };

    const row = await loadOwnerRow(slug);
    if (!row) return missing();
    if (!(await mayEdit(row, body.editToken))) return forbidden();

    const sql = getSql();
    await sql`delete from quizzes where id = ${row.id}`;
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
