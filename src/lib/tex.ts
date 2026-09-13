/**
 * LaTeX in sheets.
 *
 *   $x^2 + y^2 = z^2$      inline
 *   $$\int_0^1 x^2 dx$$    centred on its own line
 *   \$5                    a literal dollar sign
 *
 * Math has to stay on one line — the format is line-based, so a question or
 * an answer is always a single line.
 *
 * Inline math only opens and closes on a non-space character, which is what
 * keeps ordinary prose intact: "it costs $5 and $10" has no math in it, but
 * "$5x$ and $10y$" has two.
 */

import katex from "katex";

export type MathSegment =
  | { type: "text"; value: string }
  | { type: "math"; value: string; display: boolean };

export type TexProblem = { line: number; message: string };

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Sheets are shared by link, so author text is never trusted as markup. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

const isSpace = (char: string | undefined) => char === undefined || /\s/.test(char);

function findClose(input: string, from: number, delimiter: string, smart: boolean): number {
  for (let i = from; i < input.length; i += 1) {
    if (input[i] === "\\") {
      i += 1;
      continue;
    }
    if (!input.startsWith(delimiter, i)) continue;
    if (smart && isSpace(input[i - 1])) continue;
    return i;
  }
  return -1;
}

export function splitMath(input: string): MathSegment[] {
  const segments: MathSegment[] = [];
  let buffer = "";
  let i = 0;

  const flush = () => {
    if (buffer) {
      segments.push({ type: "text", value: buffer });
      buffer = "";
    }
  };

  while (i < input.length) {
    const char = input[i];

    if (char === "\\" && input[i + 1] === "$") {
      buffer += "$";
      i += 2;
      continue;
    }

    if (char === "$") {
      const display = input[i + 1] === "$";
      const delimiter = display ? "$$" : "$";
      const start = i + delimiter.length;
      const opens = display || !isSpace(input[start]);
      const end = opens ? findClose(input, start, delimiter, !display) : -1;

      if (end !== -1) {
        flush();
        segments.push({ type: "math", value: input.slice(start, end), display });
        i = end + delimiter.length;
        continue;
      }
    }

    buffer += char;
    i += 1;
  }

  flush();
  return segments;
}

export const hasMath = (text: string) => text.includes("$");

const KATEX_OPTIONS = {
  throwOnError: true,
  strict: false,
  trust: false,
  output: "htmlAndMathml",
} as const;

/** Escaped prose plus rendered math. Safe to drop into the DOM. */
export function mathToHtml(text: string): string {
  if (!hasMath(text)) return escapeHtml(text);

  return splitMath(text)
    .map((segment) => {
      if (segment.type === "text") return escapeHtml(segment.value);
      try {
        return katex.renderToString(segment.value, {
          ...KATEX_OPTIONS,
          displayMode: segment.display,
        });
      } catch {
        const delimiter = segment.display ? "$$" : "$";
        return `<code class="tex-error">${escapeHtml(delimiter + segment.value + delimiter)}</code>`;
      }
    })
    .join("");
}

function readMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.replace(/^KaTeX parse error:\s*/, "").split(" at position ")[0].trim();
}

/** Reports broken LaTeX against the source line it sits on. */
export function findTexProblems(source: string): TexProblem[] {
  const problems: TexProblem[] = [];

  source.split(/\r\n|\r|\n/).forEach((line, index) => {
    if (!hasMath(line) || /^[ \t]*#/.test(line)) return;

    for (const segment of splitMath(line)) {
      if (segment.type !== "math") continue;
      try {
        katex.renderToString(segment.value, {
          ...KATEX_OPTIONS,
          displayMode: segment.display,
        });
      } catch (error) {
        problems.push({ line: index + 1, message: `LaTeX: ${readMessage(error)}` });
      }
    }
  });

  return problems;
}
