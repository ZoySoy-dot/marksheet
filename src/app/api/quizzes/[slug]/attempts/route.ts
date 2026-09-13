import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getSql } from "@/lib/db";
import { SLUG_PATTERN } from "@/lib/ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ slug: string }> };

/**
 * Records that someone finished the sheet, and how they did. Anonymous — no
 * per-answer data, no identifiers. It only backs the "taken N times" line.
 */
export async function POST(request: Request, { params }: Context) {
  try {
    const { slug } = await params;
    if (!SLUG_PATTERN.test(slug)) {
      return NextResponse.json({ error: "No sheet with that link." }, { status: 404 });
    }

    const body = (await request.json()) as { score?: unknown; total?: unknown };
    const score = Number(body.score);
    const total = Number(body.total);

    if (!Number.isInteger(score) || !Number.isInteger(total) || total <= 0 || score < 0 || score > total) {
      return NextResponse.json({ error: "That score does not add up." }, { status: 400 });
    }

    const sql = getSql();
    const rows = (await sql`
      insert into attempts (quiz_id, score, total)
      select id, ${score}, ${total} from quizzes where slug = ${slug}
      returning id
    `) as { id: number }[];

    if (rows.length === 0) {
      return NextResponse.json({ error: "No sheet with that link." }, { status: 404 });
    }

    return NextResponse.json({ recorded: true }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
