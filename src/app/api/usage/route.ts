import { NextResponse } from "next/server";
import { currentUserId } from "@/auth";
import { apiError } from "@/lib/api";
import { balanceFor, spentMicroUsd } from "@/lib/meter";
import { PACKS, toPhp } from "@/lib/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * What this person has left, and what a top-up would buy.
 *
 * Signed out there is nothing to report, and the upload pane already asks them
 * to sign in, so it answers rather than erroring.
 */
export async function GET() {
  try {
    const userId = await currentUserId();
    if (!userId) return NextResponse.json({ signedIn: false });

    const [balance, spent] = await Promise.all([balanceFor(userId), spentMicroUsd(userId)]);

    return NextResponse.json({
      signedIn: true,
      credits: balance.credits,
      importsLeft: balance.importsLeft,
      exhausted: balance.exhausted,
      packs: PACKS.map((pack) => ({ id: pack.id, php: pack.php, tokens: pack.tokens })),
      // Not shown to the person reading a document. It is here so the numbers
      // behind a receipt can be read off the same endpoint that drives the UI.
      spentMicroUsd: spent,
      spentPhp: Number(toPhp(spent).toFixed(4)),
    });
  } catch (error) {
    return apiError(error);
  }
}
