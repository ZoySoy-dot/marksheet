/**
 * Contract tests for the PayMongo webhook path.
 *
 * Signature verification is the one place here where a mistake is a way in
 * rather than a bug, so the vectors are computed against the documented
 * algorithm rather than against this code's own output: HMAC-SHA256 of
 * `<timestamp>.<raw body>`, keyed by the webhook secret, compared against `te`
 * in test mode and `li` in live mode.
 * Run with: npm test
 */
import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import { parseSignature, readPaidCheckout, verifySignature } from "../src/lib/paymongo.ts";
import { packFor } from "../src/lib/usage.ts";

const SECRET = "whsk_a_test_secret";
const BODY = '{"data":{"id":"evt_1","attributes":{"type":"checkout_session.payment.paid"}}}';
const NOW = new Date("2026-09-18T12:00:00Z");
const TS = String(Math.floor(NOW.getTime() / 1000));

const sign = (timestamp: string, body: string, secret = SECRET): string =>
  createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");

const header = (parts: { t?: string; te?: string; li?: string }): string =>
  `t=${parts.t ?? TS},te=${parts.te ?? ""},li=${parts.li ?? ""}`;

/* ---------------- parsing ---------------- */

test("the documented header shape parses", () => {
  const parsed = parseSignature("t=1496734173,te=abc,li=def");
  assert.deepEqual(parsed, { timestamp: "1496734173", test: "abc", live: "def" });
});

test("an empty live signature in test mode is not a parse failure", () => {
  assert.equal(parseSignature("t=1496734173,te=abc,li=")?.live, "");
});

test("a missing or malformed header parses to nothing", () => {
  assert.equal(parseSignature(null), null);
  assert.equal(parseSignature(""), null);
  assert.equal(parseSignature("te=abc,li=def"), null, "no timestamp is not a signature");
});

/* ---------------- verification ---------------- */

test("a correctly signed test-mode webhook is accepted", () => {
  const ok = verifySignature({
    header: header({ te: sign(TS, BODY) }),
    rawBody: BODY,
    secret: SECRET,
    live: false,
    now: NOW,
  });
  assert.equal(ok, true);
});

test("a correctly signed live-mode webhook is accepted", () => {
  const ok = verifySignature({
    header: header({ li: sign(TS, BODY) }),
    rawBody: BODY,
    secret: SECRET,
    live: true,
    now: NOW,
  });
  assert.equal(ok, true);
});

test("a test-mode signature cannot pass as a live one", () => {
  const ok = verifySignature({
    header: header({ te: sign(TS, BODY) }),
    rawBody: BODY,
    secret: SECRET,
    live: true,
    now: NOW,
  });
  assert.equal(ok, false);
});

test("a body changed by one byte is rejected", () => {
  const ok = verifySignature({
    header: header({ te: sign(TS, BODY) }),
    rawBody: BODY.replace("evt_1", "evt_2"),
    secret: SECRET,
    live: false,
    now: NOW,
  });
  assert.equal(ok, false);
});

test("re-serialised JSON is rejected, which is why the raw body is used", () => {
  const ok = verifySignature({
    header: header({ te: sign(TS, BODY) }),
    rawBody: JSON.stringify(JSON.parse(BODY), null, 2),
    secret: SECRET,
    live: false,
    now: NOW,
  });
  assert.equal(ok, false);
});

test("the wrong secret is rejected", () => {
  const ok = verifySignature({
    header: header({ te: sign(TS, BODY, "whsk_someone_elses") }),
    rawBody: BODY,
    secret: SECRET,
    live: false,
    now: NOW,
  });
  assert.equal(ok, false);
});

test("a signature lifted onto a different timestamp is rejected", () => {
  const ok = verifySignature({
    header: header({ t: String(Number(TS) + 1), te: sign(TS, BODY) }),
    rawBody: BODY,
    secret: SECRET,
    live: false,
    now: NOW,
  });
  assert.equal(ok, false);
});

test("a retry an hour late is still accepted, because refusing it loses a payment", () => {
  const old = String(Math.floor(NOW.getTime() / 1000) - 3600);
  const ok = verifySignature({
    header: header({ t: old, te: sign(old, BODY) }),
    rawBody: BODY,
    secret: SECRET,
    live: false,
    now: NOW,
  });
  assert.equal(ok, true);
});

test("a delivery older than the day-long window is still refused", () => {
  const ancient = String(Math.floor(NOW.getTime() / 1000) - 90_000);
  const ok = verifySignature({
    header: header({ t: ancient, te: sign(ancient, BODY) }),
    rawBody: BODY,
    secret: SECRET,
    live: false,
    now: NOW,
  });
  assert.equal(ok, false);
});

test("the window can still be tightened by a caller that wants it", () => {
  const old = String(Math.floor(NOW.getTime() / 1000) - 3600);
  const ok = verifySignature({
    header: header({ t: old, te: sign(old, BODY) }),
    rawBody: BODY,
    secret: SECRET,
    live: false,
    toleranceSeconds: 300,
    now: NOW,
  });
  assert.equal(ok, false);
});

test("an empty signature never passes", () => {
  for (const live of [false, true]) {
    assert.equal(
      verifySignature({ header: header({}), rawBody: BODY, secret: SECRET, live, now: NOW }),
      false,
    );
  }
});

/* ---------------- reading the event ---------------- */

const paidEvent = (attributes: Record<string, unknown>, nest: boolean) => {
  const envelope = {
    type: "checkout_session.payment.paid",
    data: { id: "cs_123", type: "checkout_session", attributes },
  };
  return nest ? { data: { id: "evt_1", attributes: envelope } } : { data: envelope };
};

const ATTRIBUTES = {
  reference_number: "ms_abc",
  metadata: { userId: "108", packId: "small" },
  payments: [{ id: "pay_1", attributes: { amount: 4900, status: "paid" } }],
};

for (const [shape, nest] of [["nested under attributes", true], ["flat on data", false]] as const) {
  test(`a paid checkout is read when the payload is ${shape}`, () => {
    const paid = readPaidCheckout(paidEvent(ATTRIBUTES, nest));
    assert.ok(paid);
    assert.equal(paid.checkoutSessionId, "cs_123");
    assert.equal(paid.userId, "108");
    assert.equal(packFor(paid.packId)?.id, "small");
    assert.equal(paid.amountPhp, 49, "centavos are converted to pesos");
    assert.equal(paid.reference, "ms_abc");
  });
}

test("an unrelated event is not a paid checkout", () => {
  assert.equal(readPaidCheckout({ data: { attributes: { type: "payment.failed" } } }), null);
  assert.equal(readPaidCheckout({}), null);
  assert.equal(readPaidCheckout(null), null);
});

test("a paid checkout naming an unknown pack buys nothing", () => {
  const paid = readPaidCheckout(
    paidEvent({ ...ATTRIBUTES, metadata: { userId: "108", packId: "free_money" } }, true),
  );
  assert.equal(packFor(paid?.packId), null);
});

test("a paid checkout with no metadata yields no user, so nothing is granted", () => {
  const paid = readPaidCheckout(paidEvent({ ...ATTRIBUTES, metadata: {} }, true));
  assert.equal(paid?.userId, null);
  assert.equal(packFor(paid?.packId), null);
});
