# Marksheet

Paste your questions as plain text. Get an interactive quiz you can share with a link.

Built as an OMR answer sheet: circles mean pick one, squares mean pick all that apply, and the
form's own chrome is printed in "drop-out" cyan — the ink a scanner cannot see.

- **Stack** — Next.js 15 (App Router), React 19, TypeScript, Neon Postgres
- **Hosting** — Vercel

---

## The format

```
Q: What is the capital of France?
- London
- Berlin
* Paris
> Paris has been the capital since 508 AD.

Q: Which of these are prime?
* 2
- 4
* 7
- 9
```

| Mark | Meaning |
| --- | --- |
| `Q:` | starts a question |
| `*` | a correct answer |
| `-` | a wrong answer |
| `>` | a note shown after answering (optional, repeatable) |
| `#` | a line to ignore |
| `$…$` | LaTeX, typeset inline |
| `$$…$$` | LaTeX, centred on its own line |

Two or more answers marked `*` make the question **pick all that apply**. Blank lines are ignored.

A sheet will not publish while the editor reports problems. Each problem names the line to fix.

---

## Math

LaTeX is rendered with [KaTeX](https://katex.org), in questions, answers, notes and titles.

```
Q: Solve for $x$: $x^2 - 5x + 6 = 0$
* $x = 2$ or $x = 3$
- $x = 1$ or $x = 6$
> Factor it: $(x - 2)(x - 3) = 0$.

Q: Evaluate $$\int_0^1 3x^2 \, dx$$
* $1$
- $\frac{1}{3}$
```

Three rules worth knowing:

- **Math stays on one line.** The format is line-based, so a question or an answer is always a
  single line. `$$…$$` still renders centred — it just has to open and close on the same line.
- **Prices survive.** Inline math only opens and closes on a non-space character, so `it costs $5
  and $10` is prose while `$5x$ and $10y$` is math. Write `\$` for a dollar sign that refuses to
  behave.
- **Broken LaTeX is caught before publishing.** It is reported by line number next to the format
  problems, so `\fraq{1}{2}` on line 12 reads *"Line 12: LaTeX: Undefined control sequence"*.

Author text is HTML-escaped before rendering, and KaTeX runs with `trust: false` — a shared sheet
cannot inject markup into someone else's browser. KaTeX emits MathML alongside its visual output,
so equations are readable by screen readers.

---

## Running it locally

```bash
npm install
cp .env.example .env.local     # then paste your Neon connection string in
npm run db:init                # creates the tables, safe to re-run
npm run dev
```

Open <http://localhost:3000>.

Without `DATABASE_URL` the editor and **Practise without saving** still work — only publishing and
sharing need the database.

### Getting a Neon connection string

Either:

- **Through Vercel** — project → Storage → Create Database → Neon. Vercel sets `DATABASE_URL`
  for you. Pull it down locally with `vercel env pull .env.local`.
- **Through Neon directly** — <https://console.neon.tech> → your project → Connection Details →
  copy the **pooled** connection string.

---

## Deploying

Push to GitHub, import the repo at <https://vercel.com/new>, and set `DATABASE_URL` under
Project Settings → Environment Variables. Then run `npm run db:init` once against that database.

---

## How sharing works

There are no accounts.

- Publishing returns a **slug** (`/q/ab3k9x2m`) and a secret **edit token**.
- The slug is the share link. Anyone with it can take the sheet.
- The edit token is stored in `localStorage` under `marksheet.mine` and is the only proof you wrote
  the sheet. It is required to edit or delete. Clearing this browser's storage means losing the
  ability to edit — the share link keeps working.
- `/mine` lists the sheets published from the current browser, with edit links that carry the token.

Finished runs are recorded anonymously in `attempts` (score and total only, no answers, no
identifiers) to back the "taken N times" line on a sheet.

### A note on grading

Questions are sent to the browser with their correct answers, and grading happens client-side. That
is deliberate: instant feedback with no round trip. It also means a determined taker can read the
answers out of the page source. Marksheet is a study tool, not an exam invigilator — do not use it
for anything that gets a grade.

---

## Layout

```
src/
  app/
    page.tsx                          the editor
    mine/page.tsx                     sheets published from this browser
    q/[slug]/page.tsx                 take a sheet
    q/[slug]/edit/page.tsx            edit a sheet you wrote
    api/quizzes/route.ts              POST   publish
    api/quizzes/[slug]/route.ts       GET / PATCH / DELETE
    api/quizzes/[slug]/attempts/      POST   record a finished run
    globals.css                       the whole design system
  components/
    Composer.tsx                      editor, live parse readout, publish
    QuizRunner.tsx                    ready → running → report
    TeX.tsx                           renders $…$ and $$…$$ safely
    Legend.tsx, Masthead.tsx, SetupNotice.tsx
  lib/
    parse.ts                          the format, and its error messages
    tex.ts                            math splitting, rendering, validation
    quizzes.ts                        reads
    db.ts, ids.ts, api.ts, mine.ts, sample.ts
db/schema.sql                         tables
scripts/init-db.mjs                   applies schema.sql
```

## Keyboard

While drilling: <kbd>A</kbd>–<kbd>Z</kbd> or <kbd>1</kbd>–<kbd>9</kbd> mark an answer,
<kbd>Enter</kbd> continues.
