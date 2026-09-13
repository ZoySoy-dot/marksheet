/**
 * Sheets you made, remembered on this device.
 *
 * Marksheet has no accounts. The edit token returned when you publish is the
 * only proof you wrote a sheet, so it lives here. Losing this browser's
 * storage means losing the ability to edit, though the share link keeps working.
 */

export type SavedSheet = {
  slug: string;
  title: string;
  editToken: string;
  questionCount: number;
  createdAt: string;
};

const KEY = "marksheet.mine";

export function readMine(): SavedSheet[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedSheet =>
        typeof item === "object" && item !== null && typeof (item as SavedSheet).slug === "string",
    );
  } catch {
    return [];
  }
}

function write(list: SavedSheet[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage is full or blocked, but the sheet is still published */
  }
}

export function rememberSheet(sheet: SavedSheet) {
  const list = readMine().filter((s) => s.slug !== sheet.slug);
  write([sheet, ...list]);
}

export function forgetSheet(slug: string) {
  write(readMine().filter((s) => s.slug !== slug));
}

export function findSheet(slug: string): SavedSheet | undefined {
  return readMine().find((s) => s.slug === slug);
}
