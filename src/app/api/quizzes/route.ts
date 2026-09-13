import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getSql } from "@/lib/db";
import { makeEditToken, makeSlug } from "@/lib/ids";
import { parseSheet, suggestTitle } from "@/lib/parse";
import { findTexProblems } from "@/lib/tex";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SOURCE = 200_000;
const MAX_TITLE = 140;
const UNIQUE_VIOLATION = "23505";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { title?: unknown; source?: unknown };
    const source = typeof body.source === "string" ? body.source : "";
    const rawTitle = typeof body.title === "string" ? body.title.trim() : "";

    if (source.length > MAX_SOURCE) {
      return NextResponse.json(
        { error: "That sheet is too big. Split it into a few smaller ones." },
        { status: 413 },
      );
    }

    const parsed = parseSheet(source);
    const questions = parsed.questions;
    const problems = [...parsed.problems, ...findTexProblems(source)].sort((a, b) => a.line - b.line);

    if (questions.length === 0 && problems.length === 0) {
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

    // Signing in is optional. Without an account the sheet is still published,
    // and the edit token is the only way back into it.
    const { userId } = await auth();

    const title = (rawTitle || suggestTitle(questions)).slice(0, MAX_TITLE);
    const sql = getSql();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const slug = makeSlug();
      const editToken = makeEditToken();
      try {
        await sql`
          insert into quizzes (slug, edit_token, owner_id, title, source, questions, question_count)
          values (
            ${slug},
            ${editToken},
            ${userId},
            ${title},
            ${source},
            ${JSON.stringify(questions)}::jsonb,
            ${questions.length}
          )
        `;
        return NextResponse.json(
          { slug, editToken, title, questionCount: questions.length, owned: Boolean(userId) },
          { status: 201 },
        );
      } catch (error) {
        const code = (error as { code?: string })?.code;
        if (code !== UNIQUE_VIOLATION) throw error;
        // Slug collision. Astronomically unlikely, but draw another one.
      }
    }

    return NextResponse.json({ error: "Could not reserve a link. Try again." }, { status: 500 });
  } catch (error) {
    return apiError(error);
  }
}
