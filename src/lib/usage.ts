/**
 * What a document read costs, and how much of one a person has left.
 *
 * Reading a document is the only thing in Sagot that spends money per use.
 * Everything here is pure arithmetic over token counts so it can be tested
 * without a database or a model, and so the same numbers drive the gate on the
 * route, the readout in the editor and any receipt later.
 *
 * There are no subscriptions and no free allowance. A person buys a pack of
 * credits, it never expires, and AI reads come out of it. Nothing renews and
 * nothing lapses, so there is no billing cycle anywhere in this file.
 *
 * The free allowance that used to live here was removed deliberately: giving
 * away the one thing that costs money per use made every account a running
 * expense, and needed a conversion rate far above what consumer software gets
 * just to break even.
 */

/** Millionths of a USD. Money is integer arithmetic here, never a float. */
export type MicroUsd = number;

export type TokenCounts = {
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
};

/**
 * Price per million tokens, in micro-USD.
 *
 * Derived from the run recorded in COMMERCIAL.md: 1078 input and 2380 output
 * tokens billed at $0.0063, which is $0.30/1M in and $2.50/1M out to the cent.
 * Providers move their prices, so both are overridable without a code change,
 * and the figures should be re-checked against the provider before any money
 * changes hands.
 */
const DEFAULT_INPUT_PER_MTOK = 300_000;
const DEFAULT_OUTPUT_PER_MTOK = 2_500_000;

const envInt = (name: string, fallback: number): number => {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw >= 0 ? Math.round(raw) : fallback;
};

export const inputPerMTok = (): MicroUsd =>
  envInt("SAGOT_INPUT_UUSD_PER_MTOK", DEFAULT_INPUT_PER_MTOK);
export const outputPerMTok = (): MicroUsd =>
  envInt("SAGOT_OUTPUT_UUSD_PER_MTOK", DEFAULT_OUTPUT_PER_MTOK);

/**
 * What one read cost.
 *
 * Cached input is counted at the full input rate rather than the provider's
 * discount. That over-states the cost slightly when caching applies, which is
 * the safe direction to be wrong in: a balance that runs out a little early
 * costs a person nothing, where one that runs out late costs the bill.
 */
export function costMicroUsd(tokens: TokenCounts): MicroUsd {
  const input = Math.max(0, tokens.inputTokens);
  const output = Math.max(0, tokens.outputTokens);
  return Math.ceil((input * inputPerMTok()) / 1_000_000 + (output * outputPerMTok()) / 1_000_000);
}

/** Display only. The rate moves, so it is a setting rather than a constant. */
export const phpPerUsd = (): number => {
  const raw = Number(process.env.SAGOT_PHP_PER_USD);
  return Number.isFinite(raw) && raw > 0 ? raw : 57;
};

export const toPhp = (micro: MicroUsd): number => (micro / 1_000_000) * phpPerUsd();

/**
 * A typical read, measured: 1078 input and 2380 output tokens for eight
 * questions from a page of notes. Used only to turn a token balance into a
 * number a person can act on, since nobody thinks in tokens.
 */
export const TOKENS_PER_TYPICAL_IMPORT = 3_458;

export const estimateImportsLeft = (tokensLeft: number): number =>
  Math.max(0, Math.floor(tokensLeft / TOKENS_PER_TYPICAL_IMPORT));

export type Pack = {
  id: string;
  label: string;
  php: number;
  tokens: number;
};

/**
 * Buyable packs. One-off, never expiring, no renewal.
 *
 * Larger packs are better value per token and thinner on margin, which is the
 * normal shape and the right one here: the person buying the big pack is the
 * one who would otherwise have hit a wall and left.
 */
export const PACKS: Pack[] = [
  { id: "small", label: "Small", php: 49, tokens: 150_000 },
  { id: "medium", label: "Medium", php: 99, tokens: 350_000 },
  { id: "large", label: "Large", php: 199, tokens: 800_000 },
];

/**
 * One peso, for proving the payment path end to end without spending real money
 * on it.
 *
 * Deliberately not in PACKS: the top-up page is built from that list, so this
 * never appears there, and the value-per-peso rule the other packs follow does
 * not have to bend around it. Knowing the id is not enough to buy one either,
 * because it is refused unless SAGOT_TEST_PACK is set on the deployment.
 */
export const TEST_PACK: Pack = { id: "test", label: "Test", php: 1, tokens: 1_000 };

export const testPackEnabled = (): boolean => process.env.SAGOT_TEST_PACK === "1";

/** Methods the test checkout offers. Maya and QR Ph, as asked for. */
export const TEST_PACK_METHODS = ["paymaya", "qrph"];

export const packFor = (id: unknown): Pack | null => {
  // Checked before the catalogue so a real pack can never be shadowed by it.
  if (id === TEST_PACK.id) return testPackEnabled() ? TEST_PACK : null;
  return PACKS.find((pack) => pack.id === id) ?? null;
};

/** The first of the current month, UTC. Used for reporting spend, not quota. */
export const monthStart = (now: Date): Date =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

export type Balance = {
  /** Bought tokens still unspent. The only thing an AI read can draw on. */
  credits: number;
  importsLeft: number;
  exhausted: boolean;
};

export function balanceState(credits: number): Balance {
  const bought = Math.max(0, credits);
  return {
    credits: bought,
    importsLeft: estimateImportsLeft(bought),
    exhausted: bought <= 0,
  };
}

/**
 * Whether one more read is allowed to start.
 *
 * The check is "is there anything left", not "is there enough for this file",
 * because the cost of a read is unknowable until it has been done. A read that
 * overshoots is permitted to finish and recorded in full.
 */
export const canImport = (balance: Balance): boolean => !balance.exhausted;
