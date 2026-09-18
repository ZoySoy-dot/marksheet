import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { grantCredits } from "@/lib/meter";
import { isConfigured, readPaidCheckout, verifyWebhook } from "@/lib/paymongo";
import { packFor } from "@/lib/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Where PayMongo says a pack was paid for.
 *
 * This is the only thing that adds tokens to a balance. The redirect back from
 * checkout deliberately grants nothing: it can be closed, replayed or typed by
 * hand, and none of that is proof anybody paid.
 *
 * Three rules, in order:
 *
 *  1. The signature is checked against the raw bytes, before anything is
 *     parsed. Re-serialising the JSON would change them and break the check on
 *     legitimate requests.
 *  2. Granting is idempotent on the checkout session id. PayMongo retries a
 *     failed delivery up to twelve times, so a repeat is normal traffic.
 *  3. Anything unrecognised gets a 200. A non-2xx here only earns a retry of
 *     something that will never succeed.
 */
export async function POST(request: Request) {
  try {
    // Without a secret there is nothing to check a signature against, so the
    // only safe answer is to refuse rather than to trust the payload. Said
    // plainly, because a generic 500 here looks like a bug in the handler
    // rather than a missing setting.
    if (!isConfigured()) {
      return NextResponse.json({ error: "Webhooks are not configured." }, { status: 503 });
    }

    // Must be the bytes as they arrived, so the body is read as text and
    // parsed only after the signature has been checked.
    const raw = await request.text();

    if (!verifyWebhook(request.headers.get("paymongo-signature"), raw)) {
      return NextResponse.json({ error: "Bad signature." }, { status: 401 });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      return NextResponse.json({ ignored: "unparseable" });
    }

    const paid = readPaidCheckout(payload);
    if (!paid) return NextResponse.json({ ignored: "not a paid checkout" });

    const pack = packFor(paid.packId);
    if (!paid.userId || !pack) {
      // Signed by PayMongo, so it is real money, but it carries nothing that
      // says whose balance it belongs to. Loud, because somebody has paid and
      // is waiting.
      console.error("paid checkout with no usable metadata", {
        checkoutSessionId: paid.checkoutSessionId,
        packId: paid.packId,
        hasUser: Boolean(paid.userId),
      });
      return NextResponse.json({ ignored: "no metadata" });
    }

    // What the pack costs is decided here, not by the payload, so a tampered
    // amount cannot buy more tokens than were paid for.
    if (paid.amountPhp > 0 && paid.amountPhp !== pack.php) {
      console.error("paid amount does not match the pack", {
        checkoutSessionId: paid.checkoutSessionId,
        paid: paid.amountPhp,
        expected: pack.php,
      });
      return NextResponse.json({ ignored: "amount mismatch" });
    }

    const granted = await grantCredits({
      userId: paid.userId,
      tokens: pack.tokens,
      amountPhp: pack.php,
      pack: pack.id,
      // The checkout session is the thing that was paid for exactly once, so it
      // is what makes a replayed delivery harmless.
      reference: paid.checkoutSessionId,
      note: paid.reference,
    });

    return NextResponse.json({ granted });
  } catch (error) {
    return apiError(error);
  }
}
