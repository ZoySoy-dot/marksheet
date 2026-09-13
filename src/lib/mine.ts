/**
 * Quizzes made without signing in, remembered on this device only.
 *
 * The edit token returned at publish time is the only proof you wrote a quiz,
 * so it lives here. It is deliberately short-lived: a browser is not a safe
 * place to keep the only key to something, and a token that quietly stopped
 * working would be worse than one that plainly expired.
 *
 * Signing in moves these onto the account, after which the local copy is
 * deleted because the server is the record from then on.
 */

export type SavedSheet = {
  slug: string;
  title: string;
  editToken: string;
  questionCount: number;
  createdAt: string;
};

const KEY = "marksheet.mine";

/** How long an unclaimed quiz stays editable from this browser. */
export const LOCAL_TTL_MS = 6 * 60 * 60 * 1000;

export const msLeft = (sheet: SavedSheet) =>
  new Date(sheet.createdAt).getTime() + LOCAL_TTL_MS - Date.now();

export function hasExpired(sheet: SavedSheet): boolean {
  const madeAt = new Date(sheet.createdAt).getTime();
  // A record with no usable timestamp is treated as stale rather than eternal.
  return Number.isNaN(madeAt) || msLeft(sheet) <= 0;
}

/** "4 hours", "35 minutes", "under a minute". */
export function timeLeftLabel(sheet: SavedSheet): string {
  const left = msLeft(sheet);
  if (left <= 0) return "expired";
  if (left < 60_000) return "under a minute";
  // Everything rounds down. Telling someone they have longer than they do is
  // the worse mistake for an expiry.
  const minutes = Math.floor(left / 60_000);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

function write(list: SavedSheet[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage is full or blocked, but the quiz is still published */
  }
}

/** Reads, dropping anything past its expiry and rewriting storage if it changed. */
export function readMine(): SavedSheet[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const all = parsed.filter(
      (item): item is SavedSheet =>
        typeof item === "object" && item !== null && typeof (item as SavedSheet).slug === "string",
    );
    const live = all.filter((sheet) => !hasExpired(sheet));
    if (live.length !== all.length) write(live);
    return live;
  } catch {
    return [];
  }
}

export function rememberSheet(sheet: SavedSheet) {
  const list = readMine().filter((s) => s.slug !== sheet.slug);
  write([sheet, ...list]);
}

export function forgetSheet(slug: string) {
  write(readMine().filter((s) => s.slug !== slug));
}

/** Used once a quiz moves onto an account: the server is the record now. */
export function forgetMany(slugs: string[]) {
  if (slugs.length === 0) return;
  const gone = new Set(slugs);
  write(readMine().filter((s) => !gone.has(s.slug)));
}

export function findSheet(slug: string): SavedSheet | undefined {
  return readMine().find((s) => s.slug === slug);
}
