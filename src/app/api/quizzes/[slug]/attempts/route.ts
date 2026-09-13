import { currentUser } from "@/auth";
import { NextResponse } from "next/server";
import { createEmptyCard, fsrs, generatorParameters, type Card, type Grade } from "ts-fsrs";
import { apiError } from "@/lib/api";
import { getSql } from "@/lib/db";
import { SLUG_PATTERN } from "@/lib/ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ slug: string }> };

/** The library default already targets 90% retention. */
const scheduler = fsrs(generatorParameters({ request_retention: 0.9 }));

type CardResult = { key: string; rating: number; elapsedMs?: number; correct?: boolean };

type CardRow = {
  card_key: string;
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: string | null;
};

const isGrade = (value: unknown): value is Grade =>
  value === 1 || value === 2 || value === 3 || value === 4;

const toCard = (row: CardRow): Card =>
  ({
    due: new Date(row.due),
    stability: Number(row.stability),
    difficulty: Number(row.difficulty),
    elapsed_days: Number(row.elapsed_days),
    scheduled_days: Number(row.scheduled_days),
    reps: Number(row.reps),
    lapses: Number(row.lapses),
    state: Number(row.state),
    last_review: row.last_review ? new Date(row.last_review) : undefined,
  }) as Card;

/**
 * Records a finished run: the score, the points, and every card's new FSRS
 * state. Card writes are bulked, because fifty questions at two round trips
 * each would take ten seconds over HTTP.
 */
export async function POST(request: Request, { params }: Context) {
  try {
    const { slug } = await params;
    if (!SLUG_PATTERN.test(slug)) {
      return NextResponse.json({ error: "No sheet with that link." }, { status: 404 });
    }

    const body = (await request.json()) as {
      score?: unknown;
      total?: unknown;
      points?: unknown;
      durationMs?: unknown;
      cards?: unknown;
    };

    const score = Number(body.score);
    const total = Number(body.total);
    const points = Number.isFinite(Number(body.points))
      ? Math.max(0, Math.round(Number(body.points)))
      : 0;
    const durationMs = Number.isFinite(Number(body.durationMs))
      ? Math.max(0, Math.round(Number(body.durationMs)))
      : null;

    if (
      !Number.isInteger(score) ||
      !Number.isInteger(total) ||
      total <= 0 ||
      score < 0 ||
      score > total
    ) {
      return NextResponse.json({ error: "That score does not add up." }, { status: 400 });
    }

    const sql = getSql();
    const found = (await sql`select id from quizzes where slug = ${slug} limit 1`) as {
      id: number;
    }[];
    const quiz = found[0];
    if (!quiz) return NextResponse.json({ error: "No sheet with that link." }, { status: 404 });

    const me = await currentUser();
    const userId = me?.id ?? null;
    const displayName = me?.name ?? null;

    await sql`
      insert into attempts (quiz_id, score, total, points, duration_ms, user_id, display_name, image_url)
      values (${quiz.id}, ${score}, ${total}, ${points}, ${durationMs}, ${userId}, ${displayName}, ${me?.image ?? null})
    `;

    // Scheduling is per person, so a guest has nothing to record.
    const results = Array.isArray(body.cards) ? (body.cards as CardResult[]) : [];
    let scheduled = 0;

    if (userId && results.length > 0) {
      const usable = results.filter(
        (entry) => entry && typeof entry.key === "string" && isGrade(entry.rating),
      );

      if (usable.length > 0) {
        const keys = usable.map((entry) => entry.key);
        const existing = (await sql.query(
          `select card_key, due, stability, difficulty, elapsed_days, scheduled_days,
                  reps, lapses, state, last_review
           from cards
           where user_id = $1 and quiz_id = $2 and card_key = any($3::text[])`,
          [userId, quiz.id, keys],
        )) as CardRow[];

        const byKey = new Map<string, Card>(
          existing.map((row) => [row.card_key, toCard(row)] as const),
        );
        const now = new Date();
        const next = usable.map((entry) => {
          const before: Card = byKey.get(entry.key) ?? createEmptyCard<Card>(now);
          const { card } = scheduler.next(before, now, entry.rating as Grade);
          return { entry, card };
        });

        const written = (await sql.query(
          `insert into cards (user_id, quiz_id, card_key, due, stability, difficulty,
                              elapsed_days, scheduled_days, reps, lapses, state, last_review, updated_at)
           select $1, $2, t.k, t.due, t.stab, t.diff, t.ed, t.sd, t.reps, t.lapses, t.state, t.lr, now()
           from unnest($3::text[], $4::timestamptz[], $5::float8[], $6::float8[], $7::int[],
                       $8::int[], $9::int[], $10::int[], $11::smallint[], $12::timestamptz[])
             as t(k, due, stab, diff, ed, sd, reps, lapses, state, lr)
           on conflict (user_id, quiz_id, card_key) do update set
             due = excluded.due, stability = excluded.stability, difficulty = excluded.difficulty,
             elapsed_days = excluded.elapsed_days, scheduled_days = excluded.scheduled_days,
             reps = excluded.reps, lapses = excluded.lapses, state = excluded.state,
             last_review = excluded.last_review, updated_at = now()
           returning id, card_key`,
          [
            userId,
            quiz.id,
            next.map((n) => n.entry.key),
            next.map((n) => new Date(n.card.due).toISOString()),
            next.map((n) => n.card.stability),
            next.map((n) => n.card.difficulty),
            next.map((n) => n.card.elapsed_days),
            next.map((n) => n.card.scheduled_days),
            next.map((n) => n.card.reps),
            next.map((n) => n.card.lapses),
            next.map((n) => n.card.state),
            next.map((n) =>
              n.card.last_review ? new Date(n.card.last_review).toISOString() : null,
            ),
          ],
        )) as { id: number; card_key: string }[];

        const idByKey = new Map<string, number>(
          written.map((row) => [row.card_key, Number(row.id)] as const),
        );
        const logs = next
          .map((n) => ({ id: idByKey.get(n.entry.key), n }))
          .filter((row): row is { id: number; n: (typeof next)[number] } => typeof row.id === "number");

        if (logs.length > 0) {
          await sql.query(
            `insert into review_log (card_id, rating, state, elapsed_ms, correct, scheduled_days)
             select t.cid, t.rating, t.state, t.ms, t.ok, t.sd
             from unnest($1::bigint[], $2::smallint[], $3::smallint[], $4::int[], $5::boolean[], $6::int[])
               as t(cid, rating, state, ms, ok, sd)`,
            [
              logs.map((row) => row.id),
              logs.map((row) => row.n.entry.rating),
              logs.map((row) => row.n.card.state),
              logs.map((row) =>
                Number.isFinite(Number(row.n.entry.elapsedMs))
                  ? Math.round(Number(row.n.entry.elapsedMs))
                  : null,
              ),
              logs.map((row) =>
                typeof row.n.entry.correct === "boolean" ? row.n.entry.correct : null,
              ),
              logs.map((row) => row.n.card.scheduled_days),
            ],
          );
        }

        scheduled = next.length;
      }
    }

    return NextResponse.json({ recorded: true, points, scheduled }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
