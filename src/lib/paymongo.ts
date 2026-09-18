/**
 * PayMongo, for one-off top-ups.
 *
 * There is no subscription anywhere in this product, so this file only ever
 * does two things: open a hosted checkout for a pack, and check that a webhook
 * announcing payment really came from PayMongo.
 *
 * Reference: a checkout session is created at POST /v1/checkout_sessions with
 * HTTP basic auth, the secret key as the username and an empty password, and
 * amounts in centavos. Webhooks arrive with a `Paymongo-Signature` header of
 * the form `t=<unix>,te=<test>,li=<live>`, where each signature is an
 * HMAC-SHA256 of `<timestamp>.<raw body>` keyed by the *webhook's* secret,
 * which is a different secret from the API key.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Pack } from "@/lib/usage";

const API = "https://api.paymongo.com/v1";

export class PaymongoNotConfiguredError extends Error {
  constructor(which: string) {
    super(`${which} is not set. Top-ups are switched off until it is.`);
    this.name = "PaymongoNotConfiguredError";
  }
}

const secretKey = (): string => {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) throw new PaymongoNotConfiguredError("PAYMONGO_SECRET_KEY");
  return key;
};

const webhookSecret = (): string => {
  const key = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!key) throw new PaymongoNotConfiguredError("PAYMONGO_WEBHOOK_SECRET");
  return key;
};

export const isConfigured = (): boolean =>
  Boolean(process.env.PAYMONGO_SECRET_KEY && process.env.PAYMONGO_WEBHOOK_SECRET);

/**
 * Which signature in the header to trust.
 *
 * Taken from our own key rather than from the payload, because the payload is
 * exactly the thing not yet verified when this is decided.
 */
export const liveMode = (): boolean => !secretKey().startsWith("sk_test_");

/**
 * Which wallets the checkout offers. Cards are deliberately absent.
 *
 * A card carries a fixed fee of ₱13.39 on top of its percentage, which on the
 * ₱49 pack is over a quarter of the sale and roughly halves the margin. The
 * packs here are small by design and the audience pays by e-wallet anyway, so
 * the fixed fee buys nothing and costs a lot.
 *
 * Still a setting, because a method the account has not had switched on is an
 * error when the checkout is created, and because "card" can be added back
 * without a deploy if bigger packs ever make the fee worth paying.
 */
const methods = (): string[] => {
  const raw = process.env.PAYMONGO_METHODS;
  if (!raw) return ["gcash", "paymaya"];
  return raw.split(",").map((value) => value.trim()).filter(Boolean);
};

export type CheckoutSession = { id: string; url: string };

/**
 * Opens a hosted checkout for one pack.
 *
 * The price comes from the pack on the server, never from the browser, so a
 * tampered request can only ever buy a pack at its real price. The user id
 * rides along in metadata and comes back on the webhook, which is how the
 * payment finds its way to a balance.
 */
export async function openCheckout(options: {
  pack: Pack;
  userId: string;
  reference: string;
  email?: string | null;
  successUrl: string;
  cancelUrl: string;
  /** Overrides the account-wide list. Used by the one peso test checkout. */
  methods?: string[];
}): Promise<CheckoutSession> {
  const { pack, userId, reference, successUrl, cancelUrl } = options;

  const body = {
    data: {
      attributes: {
        line_items: [
          {
            name: `${pack.label} pack`,
            description: `${pack.tokens.toLocaleString()} tokens for reading documents`,
            // Centavos, so a peso price is multiplied by a hundred.
            amount: pack.php * 100,
            currency: "PHP",
            quantity: 1,
          },
        ],
        payment_method_types: options.methods ?? methods(),
        description: `Sagot ${pack.label} pack`,
        // What the payer sees in their GCash or Maya history. Without this it
        // defaults to the registered business name, which is a person's name
        // and an IT-services company nobody topping up has heard of. Only the
        // first eleven characters are shown, and an unrecognisable charge is
        // how disputes start.
        statement_descriptor: "Sagot",
        reference_number: reference,
        // Echoed back on the webhook. This is the only link between a payment
        // and the account that should receive it.
        metadata: { userId, packId: pack.id, reference },
        success_url: successUrl,
        cancel_url: cancelUrl,
        send_email_receipt: true,
        ...(options.email ? { customer_email: options.email } : {}),
      },
    },
  };

  const response = await fetch(`${API}/checkout_sessions`, {
    method: "POST",
    headers: {
      // Basic auth with the secret key as the username and no password.
      Authorization: `Basic ${Buffer.from(`${secretKey()}:`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as {
    data?: { id?: string; attributes?: { checkout_url?: string } };
    errors?: { detail?: string }[];
  };

  if (!response.ok) {
    const detail = payload.errors?.[0]?.detail ?? `PayMongo returned ${response.status}.`;
    throw new Error(detail);
  }

  const id = payload.data?.id;
  const url = payload.data?.attributes?.checkout_url;
  if (!id || !url) throw new Error("PayMongo did not return a checkout link.");
  return { id, url };
}

type ParsedSignature = { timestamp: string; test: string; live: string };

/** Splits `t=...,te=...,li=...` into its parts. */
export function parseSignature(header: string | null): ParsedSignature | null {
  if (!header) return null;
  const parts: Record<string, string> = {};
  for (const chunk of header.split(",")) {
    const at = chunk.indexOf("=");
    if (at === -1) continue;
    parts[chunk.slice(0, at).trim()] = chunk.slice(at + 1).trim();
  }
  if (!parts.t) return null;
  return { timestamp: parts.t, test: parts.te ?? "", live: parts.li ?? "" };
}

const sameString = (a: string, b: string): boolean => {
  // timingSafeEqual throws on a length mismatch, and the lengths themselves are
  // not a secret, so they are compared first.
  if (a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

/**
 * Whether a webhook really came from PayMongo.
 *
 * `rawBody` must be the bytes as they arrived. Re-serialising parsed JSON
 * changes them, and the signature is over the original.
 *
 * Exported separately from the route, and taking its secret as an argument, so
 * it can be tested against known vectors without any environment at all.
 */
export function verifySignature(options: {
  header: string | null;
  rawBody: string;
  secret: string;
  live: boolean;
  /**
   * Reject anything older than this. Zero disables it.
   *
   * A day, not a few minutes. Granting is idempotent on the checkout session
   * id, so a replayed delivery already grants nothing and this window is only
   * defence in depth. A retry of a delivery that failed, however, is ordinary
   * traffic, and refusing one because it arrived late means money taken and
   * credits never granted. The expensive mistake is the strict window.
   */
  toleranceSeconds?: number;
  now?: Date;
}): boolean {
  const parsed = parseSignature(options.header);
  if (!parsed) return false;

  const tolerance = options.toleranceSeconds ?? 86_400;
  if (tolerance > 0) {
    const sent = Number(parsed.timestamp);
    if (!Number.isFinite(sent)) return false;
    const now = Math.floor((options.now ?? new Date()).getTime() / 1000);
    if (Math.abs(now - sent) > tolerance) return false;
  }

  const expected = createHmac("sha256", options.secret)
    .update(`${parsed.timestamp}.${options.rawBody}`)
    .digest("hex");

  return sameString(expected, options.live ? parsed.live : parsed.test);
}

/**
 * How many seconds ago a delivery was signed, or null if unreadable.
 *
 * Only for logging. Nothing is refused on the strength of it.
 */
export function signatureAgeSeconds(header: string | null, now = new Date()): number | null {
  const parsed = parseSignature(header);
  if (!parsed) return null;
  const sent = Number(parsed.timestamp);
  if (!Number.isFinite(sent)) return null;
  return Math.floor(now.getTime() / 1000) - sent;
}

/** The same check, using the configured secret and mode. */
export const verifyWebhook = (header: string | null, rawBody: string): boolean =>
  verifySignature({ header, rawBody, secret: webhookSecret(), live: liveMode() });

export type PaidCheckout = {
  checkoutSessionId: string;
  userId: string | null;
  /** Looked up against the catalogue by the caller, not here. */
  packId: string | null;
  amountPhp: number;
  reference: string | null;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

/**
 * Pulls what matters out of a `checkout_session.payment.paid` event.
 *
 * PayMongo's own documentation shows this payload in two shapes — the event
 * fields sometimes under `data.attributes` and sometimes directly on `data` —
 * so both are accepted rather than betting the integration on one of them.
 * Returns null for any event that is not a paid checkout.
 */
export function readPaidCheckout(payload: unknown): PaidCheckout | null {
  const root = asRecord(asRecord(payload).data);
  const envelope = Object.keys(asRecord(root.attributes)).length
    ? asRecord(root.attributes)
    : root;

  const type = envelope.type ?? root.type;
  if (type !== "checkout_session.payment.paid") return null;

  const resource = asRecord(envelope.data);
  const attributes = asRecord(resource.attributes);
  const metadata = asRecord(attributes.metadata);

  const payments = Array.isArray(attributes.payments) ? attributes.payments : [];
  const firstPayment = asRecord(asRecord(payments[0]).attributes);
  const centavos = Number(firstPayment.amount);

  const checkoutSessionId = typeof resource.id === "string" ? resource.id : null;
  if (!checkoutSessionId) return null;

  return {
    checkoutSessionId,
    userId: typeof metadata.userId === "string" ? metadata.userId : null,
    packId: typeof metadata.packId === "string" ? metadata.packId : null,
    amountPhp: Number.isFinite(centavos) ? Math.round(centavos / 100) : 0,
    reference:
      typeof attributes.reference_number === "string" ? attributes.reference_number : null,
  };
}
