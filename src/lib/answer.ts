/**
 * Marking a typed answer.
 *
 * This is comparison, not algebra. `2x` and `x+x` are both right and only the
 * one the author listed will be accepted. That is deliberate: deciding whether
 * two expressions are equal needs a computer algebra system, and a matcher that
 * guesses would mark wrong answers right, which is worse than asking the author
 * to write out the forms they will take.
 *
 * What it does forgive is everything that was never the point of the question:
 * case, spacing, a trailing full stop, and the several ways LaTeX writes the
 * same expression. `\left(x\right)` and `(x)` are the same answer, and nobody
 * typing one meant the other.
 */

/** A stored answer that is nothing but maths, as the editor writes it. */
const WHOLLY_MATH = /^\s*\$([\s\S]*)\$\s*$/;

function inner(value: string): string {
  const math = value.match(WHOLLY_MATH);
  return math ? math[1] : value;
}

/** Prose: case, runs of space and closing punctuation are not the answer. */
function asWords(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[.,;:!?]+$/, "");
}

/**
 * Spacing commands, sizing wrappers and redundant braces all render
 * identically, so none of them can be the difference between right and wrong.
 */
const NOISE: [RegExp, string][] = [
  // Named commands need the guard so \leftarrow keeps its tail; the escaped
  // punctuation must not have it, because \, is nearly always followed by the
  // letter it was spacing away from.
  [/\\(?:left|right|quad|qquad)(?![a-zA-Z])/g, ""],
  [/\\[,;:!\s]/g, ""],
  [/\\(?:cdot|times)(?![a-zA-Z])/g, "*"],
  [/\\(?:dfrac|tfrac)(?![a-zA-Z])/g, "\\frac"],
  [/\\operatorname\s*\{([^{}]*)\}/g, "$1"],
  [/\\text\s*\{([^{}]*)\}/g, "$1"],
  [/\{([^{}])\}/g, "$1"],
  [/\s+/g, ""],
];

function asMath(latex: string): string {
  let out = latex.normalize("NFKC");
  // Braces peel one layer per pass, so {{x}} needs more than one.
  for (let pass = 0; pass < 3; pass += 1) {
    out = NOISE.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), out);
  }
  return out.toLowerCase();
}

/**
 * The forms an answer can be recognised by. Both are kept because the editor
 * decides on its own whether a short answer is maths: someone typing `x` may
 * store `x` or `$x$` depending on what they typed around it, and being marked
 * wrong for that would be baffling.
 */
export function answerForms(value: string): Set<string> {
  const bare = inner(value);
  return new Set([asWords(bare), asMath(bare)]);
}

/** True when what they typed is one of the answers the author accepts. */
export function matchesAnswer(typed: string, accepted: readonly string[]): boolean {
  if (!typed.trim()) return false;
  const mine = answerForms(typed);
  return accepted.some((candidate) => {
    if (!candidate.trim()) return false;
    for (const form of answerForms(candidate)) {
      if (form && mine.has(form)) return true;
    }
    return false;
  });
}
