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

Give it to me as a downloadable Markdown file called marksheet.md.

That file must contain the quiz and nothing else: no title, no heading, no introduction, no closing remarks, no code fences. Just the lines described below, starting with the first "Q:".

If you cannot attach a file, print the same content as plain text instead.

FORMAT

Q: the question
* a correct answer
- a wrong answer
= an answer they have to type out, instead of * and - lines
> an optional explanation, shown after the person answers
> repeat the > line for a second paragraph, a worked step, a caveat

RULES

- Every question starts with "Q:" on its own line.
- Every answer is its own line starting with "*" for correct or "-" for wrong.
- Give each question at least two answers, and never more than 26.
- Exactly one "*" makes it a pick-one question.
- Two or more "*" makes it pick-all-that-apply. Use this where the material genuinely supports it.
- Never mark every answer correct. Every question needs at least one "-".
- A question written with "=" is typed rather than chosen. The person types their answer and it is marked against the "=" lines.
- A typed question must not also carry "*" or "-" lines. It is one or the other.
- Repeat "=" for every wording you will accept. Capitals and spacing are already forgiven, so "=" lines are for genuinely different answers: an abbreviation, a synonym, a second correct form of an expression.
- Use a typed question where recalling the answer is the point and it is short and unambiguous: a term, a number, a formula, a date. Use choices everywhere else.
- Nothing is equivalent unless you list it. "$2x$" will not accept "$x+x$" on its own.
- Lines starting with ">" are the explanation, shown after the person answers. This is where the teaching happens, so do not be stingy with it.
- Use as many ">" lines as the explanation needs. Each one becomes its own line. Walk through the working, name the trap the wrong answers set, add the rule or formula worth memorising. Two to five lines is normal for anything with reasoning in it.
- One thing per ">" line. Do not cram a whole derivation onto one line.
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
> Routers forward packets using IP addresses, and IP lives at layer 3.
> Layer 2 is the switch's job: it forwards by MAC address inside one network.
> If you are deciding between them, ask whether the device needs to cross networks. That is layer 3.

Q: Which of these series converge?
* $\\sum_{n=1}^{\\infty} \\frac{1}{n^2}$
- $\\sum_{n=1}^{\\infty} \\frac{1}{n}$
* $\\sum_{n=1}^{\\infty} \\frac{1}{2^n}$
> A $p$-series $sum 1/n^p$ converges exactly when $p > 1$.
> So $1/n^2$ converges and $1/n$ does not, even though both shrink to zero.
> $sum 1/2^n$ is geometric with ratio $1/2$, so it converges to 1.

Q: What is the derivative of $x^2$ with respect to $x$?
= $2x$
= 2x
> Bring the power down and subtract one from it: $2x^{2-1} = 2x$.
> This is the power rule, and it is worth knowing cold.

Q: What name is given to the pigment that makes leaves green?
= chlorophyll
> It absorbs red and blue light and reflects green, which is why leaves look green.

My material follows.`;
}
