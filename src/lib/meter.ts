/**
 * Reading and writing the usage ledger.
 *
 * Kept apart from usage.ts so the arithmetic there stays testable without a
 * database, and apart from the route so the route reads as one story.
 */
import { getSql } from "@/lib/db";
import {
  balanceState,
  costMicroUsd,
  monthStart,
  type Balance,
  type TokenCounts,
} from "@/lib/usage";

/** Tokens spent by this person this month. Reporting only, not quota. */
export async function usedThisMonth(userId: string, now = new Date()): Promise<number> {
  const sql = getSql();
  const rows = (await sql`
    select coalesce(sum(total_tokens), 0)::bigint as used
    from imports
    where user_id = ${userId} and created_at >= ${monthStart(now).toISOString()}
  `) as { used: string | number }[];
  return Number(rows[0]?.used ?? 0);
}

/**
 * Bought tokens still unspent, and the only thing an AI read can draw on.
 * No row means this account has never topped up, which is where everyone
 * starts: there is no free allowance.
 */
export async function creditsFor(userId: string): Promise<number> {
  const sql = getSql();
  const rows = (await sql`
    select tokens_remaining from user_credits where user_id = ${userId} limit 1
  `) as { tokens_remaining: string | number }[];
  return Number(rows[0]?.tokens_remaining ?? 0);
}

/** What this person has left to spend on AI. */
export async function balanceFor(userId: string): Promise<Balance> {
  return balanceState(await creditsFor(userId));
}

/** What this person has cost, this month, for the receipt and the ledger. */
export async function spentMicroUsd(userId: string, now = new Date()): Promise<number> {
  const sql = getSql();
  const rows = (await sql`
    select coalesce(sum(cost_micro_usd), 0)::bigint as spent
    from imports
    where user_id = ${userId} and created_at >= ${monthStart(now).toISOString()}
  `) as { spent: string | number }[];
  return Number(rows[0]?.spent ?? 0);
}

export type ImportRecord = {
  userId: string;
  mode: string;
  filename: string | null;
  mediaType: string | null;
  fileBytes: number;
  model: string;
  tokens: TokenCounts;
  questionCount: number;
  ok: boolean;
};

/**
 * Records one read and takes what it cost out of the balance.
 *
 * Called for failures too: a model that ran and then returned something
 * unusable has still been paid for, and a ledger that only counts successes
 * under-reports the bill and leaves a free way to burn tokens.
 *
 * The row and the decrement are two statements rather than one transaction,
 * because the serverless driver speaks HTTP. A crash between them under-charges
 * by one read, which is the safe direction: the spend is still in the ledger
 * and can be reconciled, and nobody is billed for something not recorded.
 */
export async function recordImport(entry: ImportRecord): Promise<void> {
  const { tokens } = entry;
  const total = Math.max(0, tokens.inputTokens) + Math.max(0, tokens.outputTokens);
  const sql = getSql();

  await sql`
    insert into imports (
      user_id, mode, filename, media_type, file_bytes, model,
      input_tokens, cached_tokens, output_tokens, total_tokens,
      cost_micro_usd, question_count, ok
    ) values (
      ${entry.userId}, ${entry.mode}, ${entry.filename}, ${entry.mediaType},
      ${entry.fileBytes}, ${entry.model},
      ${Math.max(0, tokens.inputTokens)}, ${Math.max(0, tokens.cachedTokens)},
      ${Math.max(0, tokens.outputTokens)}, ${total},
      ${costMicroUsd(tokens)}, ${entry.questionCount}, ${entry.ok}
    )
  `;

  if (total > 0) {
    // greatest() floors the balance at zero, so a read that overshot what was
    // left cannot leave someone owing tokens they would have to buy back before
    // their next purchase worked.
    await sql`
      update user_credits
      set tokens_remaining = greatest(0, tokens_remaining - ${total}),
          updated_at = now()
      where user_id = ${entry.userId}
    `;
  }
}

/**
 * Adds bought tokens to a balance, and records why. Safe to call twice.
 *
 * `reference` is the idempotency key: the PayMongo checkout session id for a
 * purchase, or anything unique for a manual grant. PayMongo retries a webhook
 * up to twelve times, so this *will* be called again for a payment already
 * granted, and the second call must be a no-op rather than a second pack.
 *
 * The grant row is inserted first and the balance moves only if that insert
 * actually happened. Doing it the other way round would credit tokens and then
 * discover the grant was a duplicate, with no way back.
 *
 * Returns true if this call is what granted the tokens.
 */
export async function grantCredits(grant: {
  userId: string;
  tokens: number;
  amountPhp: number;
  pack: string | null;
  reference: string;
  note?: string | null;
}): Promise<boolean> {
  const tokens = Math.max(0, Math.round(grant.tokens));
  if (tokens === 0 || !grant.reference) return false;
  const sql = getSql();

  const inserted = (await sql`
    insert into credit_grants (user_id, tokens, amount_php, pack, reference, note)
    values (${grant.userId}, ${tokens}, ${Math.max(0, Math.round(grant.amountPhp))},
            ${grant.pack}, ${grant.reference}, ${grant.note ?? null})
    on conflict (reference) do nothing
    returning id
  `) as { id: string | number }[];

  if (inserted.length === 0) return false;

  await sql`
    insert into user_credits (user_id, tokens_remaining)
    values (${grant.userId}, ${tokens})
    on conflict (user_id) do update
      set tokens_remaining = user_credits.tokens_remaining + ${tokens},
          updated_at = now()
  `;
  return true;
}
