import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { apiError, tokensMatch } from "@/lib/api";
import { getSql } from "@/lib/db";
import { SLUG_PATTERN } from "@/lib/ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ slug: string }> };

/**
 * Moves a sheet published without an account into the signed-in account.
 * Proof is the edit token the browser kept at publish time, so only the person
 * who actually wrote the sheet can claim it.
 */
export async function POST(request: Request, { params }: Context) {
  try {
    const { slug } = await params;
    if (!SLUG_PATTERN.test(slug)) {
      return NextResponse.json({ error: "No sheet with that link." }, { status: 404 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Sign in first to keep a sheet." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { editToken?: unknown };

    const sql = getSql();
    const rows = (await sql`
      select id, edit_token, owner_id from quizzes where slug = ${slug} limit 1
    `) as { id: number; edit_token: string; owner_id: string | null }[];
    const row = rows[0];
    if (!row) return NextResponse.json({ error: "No sheet with that link." }, { status: 404 });

    if (row.owner_id === userId) {
      return NextResponse.json({ claimed: true, alreadyYours: true });
    }
    if (row.owner_id) {
      return NextResponse.json({ error: "That sheet belongs to someone else." }, { status: 403 });
    }
    if (!tokensMatch(body.editToken, row.edit_token)) {
      return NextResponse.json({ error: "That edit key is not valid for this sheet." }, { status: 403 });
    }

    await sql`update quizzes set owner_id = ${userId}, updated_at = now() where id = ${row.id}`;
    return NextResponse.json({ claimed: true });
  } catch (error) {
    return apiError(error);
  }
}
