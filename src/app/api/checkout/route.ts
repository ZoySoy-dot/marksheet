import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { apiError } from "@/lib/api";
import { isConfigured, openCheckout, PaymongoNotConfiguredError } from "@/lib/paymongo";
import { packFor, TEST_PACK, TEST_PACK_METHODS } from "@/lib/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Opens a hosted checkout for one pack.
 *
 * The browser sends only which pack. The price, the tokens and the account it
 * lands in are all decided here, so the worst a tampered request can do is buy
 * a real pack at its real price.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Sign in to top up." }, { status: 401 });
    }

    if (!isConfigured()) {
      return NextResponse.json(
        { error: "Top-ups are not switched on yet." },
        { status: 503 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as { pack?: unknown };
    const pack = packFor(body.pack);
    if (!pack) return NextResponse.json({ error: "No such pack." }, { status: 400 });

    const origin = new URL(request.url).origin;
    const reference = `ms_${randomUUID()}`;

    const checkout = await openCheckout({
      pack,
      userId,
      reference,
      email: session.user.email ?? null,
      successUrl: `${origin}/topup?paid=1`,
      cancelUrl: `${origin}/topup?cancelled=1`,
      ...(pack.id === TEST_PACK.id ? { methods: TEST_PACK_METHODS } : {}),
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    if (error instanceof PaymongoNotConfiguredError) {
      return NextResponse.json({ error: "Top-ups are not switched on yet." }, { status: 503 });
    }
    return apiError(error);
  }
}
