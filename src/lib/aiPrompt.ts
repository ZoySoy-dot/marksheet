/**
 * The brief handed to a chatbot so it writes a sheet Marksheet can read.
 *
 * Written to be pasted into Claude, Gemini or ChatGPT alongside the person's
 * own material, since those tools already read PDFs, slides and photos, so there is
 * nothing for Marksheet to parse.
 */

export type PromptOptions = {
  /** 0 means "as many as the material supports". */
  count: number;
};

export function buildPrompt({ count }: PromptOptions): string {
  const howMany =
    count > 0
      ? `Write ${count} questions.`
      : "Write as many questions as the material genuinely supports, and stop there.";

  return `You are turning my study material into a quiz for Marksheet.

Reply with ONLY the quiz in the format below. No preamble, no sign-off, no explanation, no code fences.

FORMAT

Q: the question
* a correct answer
- a wrong answer
> an optional note explaining the answer, shown after the person answers

RULES

- Every question starts with "Q:" on its own line.
- Every answer is its own line starting with "*" for correct or "-" for wrong.
- Give each question at least two answers, and never more than 26.
- Exactly one "*" makes it a pick-one question.
- Two or more "*" makes it pick-all-that-apply. Use this where the material genuinely supports it.
- Never mark every answer correct. Every question needs at least one "-".
- Lines starting with ">" are optional notes. Use one to say why the answer is right. They are shown after the person answers, so this is where the teaching happens.
- Separate questions with a blank line.
- Keep every question and every answer on ONE line. No line breaks inside them.

MATH AND SYMBOLS

- Wrap LaTeX in single dollar signs for inline maths: $x^2 - 5x + 6 = 0$
- Wrap it in double dollar signs to centre it: $$\\int_0^1 3x^2 \\, dx$$
- Maths must stay on one line, double dollars included.
- Write \\$ for a literal dollar sign.

WHAT TO WRITE

- ${howMany}
- Test the material I give you, not general knowledge around it.
- Write wrong answers that are actually tempting: common confusions, near-misses, swapped terms, the right idea applied to the wrong case. Never filler like "none of the above" or "all of the above".
- Vary which position the correct answer sits in.
- Match the wording and notation of my material.
- If the material is thin in places, skip those rather than padding.

EXAMPLE OF THE OUTPUT I WANT

Q: Which layer of the OSI model does a router operate at?
- Layer 2, data link
* Layer 3, network
- Layer 4, transport
> Routers forward packets using IP addresses, which live at layer 3.

Q: Which of these series converge?
* $\\sum_{n=1}^{\\infty} \\frac{1}{n^2}$
- $\\sum_{n=1}^{\\infty} \\frac{1}{n}$
* $\\sum_{n=1}^{\\infty} \\frac{1}{2^n}$
> A $p$-series converges when $p > 1$. The harmonic series diverges.

My material follows.`;
}
