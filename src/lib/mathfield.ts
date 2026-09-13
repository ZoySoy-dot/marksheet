/**
 * Translating between what a math field holds and what the sheet stores.
 *
 * MathLive always hands back LaTeX. Our format stores an answer as plain text
 * unless it actually contains maths, and the whole point of a plain-text format
 * is that "Layer 3, network" reads as "Layer 3, network" in the source rather
 * than as `$\text{Layer 3, network}$`.
 *
 * So a value that is nothing but text is unwrapped, and anything with real
 * maths in it is wrapped in the single dollars the parser already understands.
 */

const TEXT_OPEN = "\\text{";

/**
 * MathLive writes a dialect of its own, and KaTeX renders the finished quiz.
 * KaTeX rejects every command below, so an equation built in the editor could
 * look correct there and then refuse to publish, citing a command the author
 * never typed.
 *
 * \placeholder is the one that bites: it marks an empty slot, so a fraction
 * with only the numerator filled carries it.
 */
const MATHLIVE_ONLY: [RegExp, string][] = [
  [/\\placeholder\s*\{[^{}]*\}/g, ""],
  [/\\placeholder(?![a-zA-Z])/g, ""],
  [/\\mleft(?![a-zA-Z])/g, "\\left"],
  [/\\mright(?![a-zA-Z])/g, "\\right"],
  [/\\differentialD(?![a-zA-Z])/g, "d"],
  [/\\exponentialE(?![a-zA-Z])/g, "e"],
  [/\\imaginaryI(?![a-zA-Z])/g, "i"],
];

/** Rewrites MathLive's own commands into LaTeX that KaTeX understands. */
export function normaliseForKatex(latex: string): string {
  return MATHLIVE_ONLY.reduce(
    (out, [pattern, replacement]) => out.replace(pattern, replacement),
    latex,
  ).trim();
}

/** Characters that would otherwise change the meaning of \text{...}. */
const ESCAPES: [RegExp, string][] = [
  [/\\/g, "\\backslash "],
  [/\{/g, "\\{"],
  [/\}/g, "\\}"],
  [/\$/g, "\\$"],
  [/#/g, "\\#"],
  [/%/g, "\\%"],
  [/&/g, "\\&"],
  [/_/g, "\\_"],
];

function escapeForText(plain: string): string {
  return ESCAPES.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), plain);
}

function unescapeFromText(latex: string): string {
  return latex
    .replace(/\\backslash\s?/g, "\\")
    .replace(/\\([{}$#%&_])/g, "$1");
}

/**
 * True when the value is a single \text{...} spanning the whole string, which
 * is what MathLive produces for an answer that is only words.
 */
function wholeTextSpan(latex: string): string | null {
  if (!latex.startsWith(TEXT_OPEN)) return null;

  let depth = 1;
  for (let i = TEXT_OPEN.length; i < latex.length; i += 1) {
    const char = latex[i];
    if (char === "\\") {
      i += 1; // an escaped character cannot close the group
      continue;
    }
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      // Only a span that reaches the very end counts as "all text".
      if (depth === 0) return i === latex.length - 1 ? latex.slice(TEXT_OPEN.length, i) : null;
    }
  }
  return null;
}

/** Math field value to the string stored in the sheet. */
export function fieldToStored(latex: string): string {
  const trimmed = normaliseForKatex(latex);
  if (!trimmed) return "";

  const asText = wholeTextSpan(trimmed);
  if (asText !== null) return unescapeFromText(asText).trim();

  return `$${trimmed}$`;
}

/** The stored string back into something the math field can hold. */
export function storedToField(stored: string): string {
  const trimmed = stored.trim();
  if (!trimmed) return "";

  // Already maths: hand the inner LaTeX straight over.
  if (trimmed.length >= 2 && trimmed.startsWith("$") && trimmed.endsWith("$")) {
    const inner = trimmed.slice(1, -1).trim();
    // A display block keeps its own delimiters inside the field.
    if (inner.startsWith("$") && inner.endsWith("$")) return inner.slice(1, -1).trim();
    if (inner) return inner;
  }

  return `${TEXT_OPEN}${escapeForText(trimmed)}}`;
}
