# Marksheet

Paste your questions as plain text. Get an interactive quiz you can share with a link.

Built as an OMR answer sheet: circles mean pick one, squares mean pick all that apply, and the
form's own chrome is printed in "drop-out" cyan — the ink a scanner cannot see.

- **Stack** — Next.js 15 (App Router), React 19, TypeScript, Neon Postgres, Clerk auth, KaTeX
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

## Writing a sheet with a chatbot

`/ai` hands you a brief containing the whole format. Paste it into Claude, Gemini or ChatGPT along
with your reviewer — they read PDFs, slides and photos of notes natively — and paste the reply into
the editor.

Marksheet does not call any model itself. There is no API key to manage, nothing to pay for, and no
upload to parse, because the chatbot you already use does all three. The brief is built in
`src/lib/aiPrompt.ts`; the question count is the only knob.

The parser ignores code-fence lines, since chatbots wrap their answer in one however firmly the
brief asks them not to.

> A model will occasionally be confidently wrong about your material. Read what comes back before
> publishing — a sheet that drills the wrong answer is worse than no sheet.

### Why not a built-in generator?

A Claude Pro or Gemini Advanced subscription cannot be linked to a third-party site; neither
provider offers consumer-account OAuth for this. The alternatives were asking every user to set up
pay-per-use API billing, or Marksheet paying per generated quiz. Copy-paste costs nothing, works
with every chatbot, and gets file handling for free.

---

## Running it locally

```bash
npm install
cp .env.example .env.local     # then fill in Neon and Clerk keys
npm run db:init                # creates the tables, safe to re-run
npm run dev                    # http://localhost:3000
npm test                       # format and LaTeX contract tests
```

Three keys are needed: `DATABASE_URL` from Neon, and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` plus
`CLERK_SECRET_KEY` from the Clerk dashboard.

Without `DATABASE_URL` the editor and **Practise without saving** still work — only publishing and
sharing need the database.

> On Windows, do not pipe secrets into `vercel env add` from PowerShell. It prepends a UTF-8 BOM,
> which silently corrupts the value and makes Clerk reject the key at the edge. Redirect from a
> file instead: `vercel env add NAME production < key.txt`.

### Getting a Neon connection string

Either:

- **Through Vercel** — project → Storage → Create Database → Neon. Vercel sets `DATABASE_URL`
  for you. Pull it down locally with `vercel env pull .env.local`.
- **Through Neon directly** — <https://console.neon.tech> → your project → Connection Details →
  copy the **pooled** connection string.

---

## Deploying

Push to GitHub and import the repo at <https://vercel.com/new>. Set `DATABASE_URL`,
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` under Project Settings → Environment
Variables, then run `npm run db:init` once against that database.

Neon can be provisioned straight from the CLI, which sets `DATABASE_URL` across all three
environments and connects it to the project:

```bash
vercel integration add neon
vercel env pull .env.local
npm run db:init
```

---

## Accounts and sharing

Accounts are [Clerk](https://clerk.com). Signing in is optional — it decides where a sheet lives,
not whether you can use the app.

**Taking a sheet never needs an account.** Share links, the take page and the attempts endpoint are
open to everyone. `clerkMiddleware()` reads the session onto each request and protects no routes;
ownership is enforced per-route instead.

**Publishing signed in** stores your Clerk user id on the sheet. It shows up under `/mine` from any
browser you sign in from, and you can edit it without holding any key.

**Publishing signed out** still works. The sheet gets a secret **edit token**, kept in
`localStorage` under `marksheet.mine`, which is then the only proof you wrote it. Clear that
browser's storage and you lose the ability to edit — the share link keeps working.

**Claiming.** Signed in, `/mine` offers to move any sheets this browser published into your account.
`POST /api/quizzes/<slug>/claim` takes the edit token as proof and only works on a sheet that has no
owner yet.

**Editing** is allowed if either test passes: you are signed in as the owner, or you hold the edit
token. Keeping the token path alive on an owned sheet is what makes `/q/<slug>/edit?t=<token>` a
shareable link for someone helping you write it.

Finished runs are recorded anonymously in `attempts` (score and total only — no answers, no user
id) to back the "taken N times" line on a sheet.

### A note on grading

Questions are sent to the browser with their correct answers, and grading happens client-side. That
is deliberate: instant feedback with no round trip. It also means a determined taker can read the
answers out of the page source. Marksheet is a study tool, not an exam invigilator — do not use it
for anything that gets a grade.

---

## Layout

```
src/
  middleware.ts                       clerkMiddleware, protects nothing on purpose
  app/
    page.tsx                          the editor
    mine/page.tsx                     your sheets (server-rendered from the account)
    q/[slug]/page.tsx                 take a sheet
    q/[slug]/edit/page.tsx            edit a sheet you own or hold the key for
    api/quizzes/route.ts              POST   publish
    api/quizzes/[slug]/route.ts       GET / PATCH / DELETE
    api/quizzes/[slug]/attempts/      POST   record a finished run
    api/quizzes/[slug]/claim/         POST   move an ownerless sheet into your account
    globals.css                       the whole design system
  components/
    Composer.tsx                      editor, live parse readout, publish
    QuizRunner.tsx                    ready → running → report
    MineList.tsx                      owned sheets, local sheets, claiming
    TeX.tsx                           renders $…$ and $$…$$ safely
    Legend.tsx, Masthead.tsx, SetupNotice.tsx
  lib/
    parse.ts                          the format, and its error messages
    tex.ts                            math splitting, rendering, validation
    quizzes.ts                        reads, including listSheetsByOwner
    db.ts, ids.ts, api.ts, mine.ts, sample.ts
db/schema.sql                         tables, safe to re-run
scripts/init-db.mjs                   applies schema.sql
scripts/*.test.ts                     format and LaTeX contract tests
```

## Keyboard

While drilling: <kbd>A</kbd>–<kbd>Z</kbd> or <kbd>1</kbd>–<kbd>9</kbd> mark an answer,
<kbd>Enter</kbd> continues.
