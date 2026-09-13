/**
 * A durable identity for a question, so review history survives editing.
 *
 * Question ids are positional (q0, q1, ...), which is fine inside one run but
 * useless for scheduling: insert a question at the top and every card below it
 * would inherit a stranger's history. The key is derived from the question's
 * own text instead, so reordering costs nothing and only rewriting the question
 * itself starts a new card, which is the right behaviour anyway.
 */

/** Case and spacing are not meaningful edits. */
function normalise(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

function fnv1a(input: string, seed: number): number {
  let hash = seed;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

const hex8 = (n: number) => n.toString(16).padStart(8, "0");

/**
 * `occurrence` separates two questions that read identically inside one sheet.
 * Keys are only ever compared within a quiz, so 64 bits is ample.
 */
export function cardKey(questionText: string, occurrence = 0): string {
  const base = `${normalise(questionText)}#${occurrence}`;
  return hex8(fnv1a(base, 0x811c9dc5)) + hex8(fnv1a(base, 0x7f3a5c1d));
}

/** Assigns keys across a whole sheet, counting repeats as it goes. */
export function cardKeysFor(questionTexts: string[]): string[] {
  const seen = new Map<string, number>();
  return questionTexts.map((text) => {
    const norm = normalise(text);
    const occurrence = seen.get(norm) ?? 0;
    seen.set(norm, occurrence + 1);
    return cardKey(text, occurrence);
  });
}
