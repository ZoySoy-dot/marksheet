import { currentUserId } from "@/auth";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getSql } from "@/lib/db";
import { SLUG_PATTERN } from "@/lib/ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ slug: string }> };

const missing = () => NextResponse.json({ error: "No sheet with that link." }, { status: 404 });
const needsAccount = () =>
  NextResponse.json({ error: "Sign in to save a sheet." }, { status: 401 });

async function quizIdFor(slug: string): Promise<number | null> {
  const sql = getSql();
  const rows = (await sql`select id from quizzes where slug = ${slug} limit 1`) as {
    id: number;
  }[];
  return rows[0] ? Number(rows[0].id) : null;
}

/** Keeps a sheet in your library, including one you did not write. */
export async function POST(_request: Request, { params }: Context) {
  try {
    const { slug } = await params;
    if (!SLUG_PATTERN.test(slug)) return missing();

    const userId = await currentUserId();
    if (!userId) return needsAccount();

    const quizId = await quizIdFor(slug);
    if (quizId === null) return missing();

    const sql = getSql();
    await sql`
      insert into saved_quizzes (user_id, quiz_id)
      values (${userId}, ${quizId})
      on conflict (user_id, quiz_id) do nothing
    `;

    return NextResponse.json({ saved: true });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { slug } = await params;
    if (!SLUG_PATTERN.test(slug)) return missing();

    const userId = await currentUserId();
    if (!userId) return needsAccount();

    const quizId = await quizIdFor(slug);
    if (quizId === null) return missing();

    const sql = getSql();
    await sql`delete from saved_quizzes where user_id = ${userId} and quiz_id = ${quizId}`;

    return NextResponse.json({ saved: false });
  } catch (error) {
    return apiError(error);
  }
}
