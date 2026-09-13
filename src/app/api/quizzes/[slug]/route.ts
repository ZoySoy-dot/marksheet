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

const missing = () => NextResponse.json({ error: "No sheet with that link." }, { status: 404 });
const forbidden = () =>
  NextResponse.json({ error: "That edit link is not valid for this sheet." }, { status: 403 });

export async function GET(_request: Request, { params }: Context) {
  try {
    const { slug } = await params;
    const quiz = await getQuizBySlug(slug);
    if (!quiz) return missing();
    return NextResponse.json({
      slug: quiz.slug,
      title: quiz.title,
      source: quiz.source,
      questions: quiz.questions,
      questionCount: quiz.questionCount,
      createdAt: quiz.createdAt,
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

    const sql = getSql();
    const rows = (await sql`
      select id, edit_token from quizzes where slug = ${slug} limit 1
    `) as { id: number; edit_token: string }[];
    const row = rows[0];
    if (!row) return missing();
    if (!tokensMatch(body.editToken, row.edit_token)) return forbidden();

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

    const sql = getSql();
    const rows = (await sql`
      select id, edit_token from quizzes where slug = ${slug} limit 1
    `) as { id: number; edit_token: string }[];
    const row = rows[0];
    if (!row) return missing();
    if (!tokensMatch(body.editToken, row.edit_token)) return forbidden();

    await sql`delete from quizzes where id = ${row.id}`;
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
