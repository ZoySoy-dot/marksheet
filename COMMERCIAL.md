# Commercialising Marksheet

Working notes, not a plan of record. Written 2026-09-17.

---

## The position

Do not compete with Gizmo.

Gizmo is a funded consumer app with mobile clients and a growth engine aimed at
students on TikTok. Its model is: **the learner pays, AI makes the content, the
content is disposable and private.** Their cost scales with usage, which is why
they have to charge learners. Beating them at being them is not available to one
person.

Marksheet's marginal cost per user is close to zero, because taking a sheet is
free to serve and only authoring ever touches a model. That makes a different
business possible, and it is roughly the inverse of theirs:

> **Free forever for learners. Charge the author.**

Gizmo generates questions. Marksheet publishes them.

---

## Where Gizmo is structurally weak

**Authorship.** Gizmo has no real authoring story, because its content is
generated rather than written. Marksheet has a format: human writable, diffable,
reviewable, version controllable. The author can be a lecturer, a TA or a review
centre, not only a student working alone.

**Trust.** A sheet that drills the wrong answer is worse than no sheet. For a
board exam, AI generated questions are a liability, and a vetted bank is worth
money.

**Maths.** KaTeX, MathLive and the LaTeX normalisation in `answer.ts` are a real
moat. Gizmo is weak here, and maths is where licensure exams live.

**The cohort.** `runs`, `cards` and `review_log` already hold everything needed
to answer "which question did my whole class get wrong". `listTroubleSpots()` is
most of the way there. Gizmo does not surface item analysis because its content
is not shared. Institutions pay for that; individuals never do.

---

## The wedge

The Philippine review centre industry: LET, PNLE, CPALE, Civil Service, the
engineering boards, Criminology, UPCAT and CET prep. These sell programmes for
five to fifteen thousand pesos a head, run on Word documents and printed
handouts, and are technologically abandoned. Gizmo does not serve them at all.

Not underserved. Empty.

It stays empty because a self serve consumer app cannot do a five hundred seat
deployment with somebody else's branding and a bank they refuse to make public.
That is a job Gizmo does not want, and one person can do.

The arithmetic: at ₱200 per student per programme, a centre with 500 students is
₱100,000 a year, and it is noise against what they already charge. Three centres
is real revenue.

---

## What is built

- The format, the parser, and a serialiser that is its exact inverse
- FSRS scheduling with grades inferred from thinking time, no self rating
- Points, leaderboards, live presence, resumable runs
- Typed answers with a maths aware matcher that refuses to guess
- Document import: transcribe an existing paper, or write questions from notes
- Google sign in, optional everywhere except import

## What is needed, in order

| # | Thing | Why it is in this position |
| --- | --- | --- |
| 1 | **Private sheets** (`visibility` column) | Everything is public by link today, which disqualifies every paid conversation. A centre's bank is its product. Smallest change, unlocks the most. |
| 2 | **Per account import quota** | There is no cap today. One person with a textbook is an unbounded bill. Doubles as the paid tier hook. |
| 3 | **Cohorts and item analysis** | The recurring value. Mostly queries over tables that already exist. |
| 4 | **Server side grading** | Answers ship to the browser today. This is both the exam integrity feature and the IP protection one. The only real architectural change. |
| 5 | **Billing** | PayMongo or Xendit, because GCash and Maya matter more than cards locally. Last, and only once someone has said they would pay. |

---

## Pricing shape

| Tier | Price | What it buys |
| --- | --- | --- |
| Free | ₱0 | Everything today. Taking a sheet never needs an account, and that is the distribution engine. Never paywall it. |
| Author | ~₱249/mo | Private sheets, cohorts, analytics, a higher import quota. Priced against Netflix, not against SaaS seats. |
| Institution | ₱15k to ₱60k/yr plus seats | Branding, server graded mode, item analysis, several instructors. |

---

## Unit economics

Measured on `google/gemini-2.5-flash` through AI Gateway, September 2026.
A real run of 1078 input and 2380 output tokens produced eight questions.

| Case | USD | PHP |
| --- | --- | --- |
| One page of notes, 8 questions | $0.0063 | ₱0.36 |
| 20 questions from ~10 pages | $0.0177 | ₱1.03 |
| 40 page past paper, read mode | $0.0360 | ₱2.09 |
| 120 question bank, large PDF | $0.0895 | ₱5.19 |

About **₱1 for a realistic quiz**. A thousand of them is roughly $17.70.

Ten free generations a month costs about ₱10 per active user, which is cheap
enough to be an acquisition channel rather than a cost to brace against. This is
the opposite of Gizmo's position, where inference is the thing forcing them to
charge.

Set a ceiling with `vercel ai-gateway budgets` before any of this is public.

---

## Things not to do

**Do not make AI generation the headline.** It is an on ramp, not the product.
Leading with "upload a PDF, get a quiz" puts Marksheet on Gizmo's axis, where
they have the brand, the apps and the scale. The generated sheet landing in the
editor for review, rather than straight into a drill, is the whole difference.

**Do not chase consumer gamification.** The OMR aesthetic is an asset for
somebody six weeks from a board exam. It is not a deficiency to fix with a
mascot and a streak counter.

**Do not build the marketplace first.** Selling sheets between strangers is a
cold start problem, and it is not what anyone has asked for.

---

## The cheapest next step

Put it in front of one DLSU class for one term. No pricing, no pitch. One
lecturer or one org, one set of sheets, one midterm, then look at whether anyone
takes a second sheet.

If they do, that says what to build. If they do not, no amount of PDF import was
going to save it, and finding that out costs ₱0 instead of three months.
