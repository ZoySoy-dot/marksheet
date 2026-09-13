import { currentUser, currentUserId } from "@/auth";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getSql } from "@/lib/db";
import { SLUG_PATTERN } from "@/lib/ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ slug: string }> };

const missing = () => NextResponse.json({ error: "No sheet with that link." }, { status: 404 });

async function quizIdFor(slug: string): Promise<number | null> {
  const sql = getSql();
  const rows = (await sql`select id from quizzes where slug = ${slug} limit 1`) as { id: number }[];
  return rows[0] ? Number(rows[0].id) : null;
}

/**
 * Saves where someone is up to, and refreshes the heartbeat that puts them in
 * the "taking it now" list. Called on every answer and on a timer while the
 * drill is open. Signed out there is nobody to attribute it to, so the client
 * keeps its own progress instead and this quietly does nothing.
 */
export async function POST(request: Request, { params }: Context) {
  try {
    const { slug } = await params;
    if (!SLUG_PATTERN.test(slug)) return missing();

    const me = await currentUser();
    if (!me) return NextResponse.json({ tracked: false }, { status: 200 });
    const userId = me.id;

    const quizId = await quizIdFor(slug);
    if (quizId === null) return missing();

    const body = (await request.json().catch(() => ({}))) as {
      orderKeys?: unknown;
      picks?: unknown;
      revealed?: unknown;
      timings?: unknown;
      position?: unknown;
      mode?: unknown;
      finished?: unknown;
    };

    const sql = getSql();

    if (body.finished === true) {
      await sql`
        update runs set finished_at = now(), last_seen_at = now()
        where user_id = ${userId} and quiz_id = ${quizId}
      `;
      return NextResponse.json({ tracked: true, finished: true });
    }

    const displayName = me.name;

    const orderKeys = Array.isArray(body.orderKeys)
      ? (body.orderKeys as unknown[]).filter((k): k is string => typeof k === "string")
      : [];
    const position = Number.isFinite(Number(body.position)) ? Math.max(0, Math.round(Number(body.position))) : 0;
    const mode = body.mode === "test" ? "test" : "reviewer";
    const asJson = (value: unknown) =>
      JSON.stringify(value && typeof value === "object" ? value : {});

    await sql`
      insert into runs (user_id, quiz_id, display_name, image_url, order_keys, picks, revealed, timings, position, mode, last_seen_at, finished_at)
      values (
        ${userId}, ${quizId}, ${displayName}, ${me.image}, ${orderKeys},
        ${asJson(body.picks)}::jsonb, ${asJson(body.revealed)}::jsonb, ${asJson(body.timings)}::jsonb,
        ${position}, ${mode}, now(), null
      )
      on conflict (user_id, quiz_id) do update set
        display_name = excluded.display_name,
        image_url    = excluded.image_url,
        order_keys   = excluded.order_keys,
        picks        = excluded.picks,
        revealed     = excluded.revealed,
        timings      = excluded.timings,
        position     = excluded.position,
        mode         = excluded.mode,
        last_seen_at = now(),
        finished_at  = null
    `;

    return NextResponse.json({ tracked: true });
  } catch (error) {
    return apiError(error);
  }
}

/** Abandons the saved run, so "continue where you left off" stops offering. */
export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { slug } = await params;
    if (!SLUG_PATTERN.test(slug)) return missing();

    const userId = await currentUserId();
    if (!userId) return NextResponse.json({ tracked: false });

    const quizId = await quizIdFor(slug);
    if (quizId === null) return missing();

    const sql = getSql();
    await sql`delete from runs where user_id = ${userId} and quiz_id = ${quizId}`;
    return NextResponse.json({ cleared: true });
  } catch (error) {
    return apiError(error);
  }
}
