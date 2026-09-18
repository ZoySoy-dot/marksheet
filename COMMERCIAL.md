# Commercialising Sagot

Working notes, not a plan of record. Written 2026-09-17.

---

## The position

Do not compete with Gizmo.

Gizmo is a funded consumer app with mobile clients and a growth engine aimed at
students on TikTok. Its model is: **the learner pays, AI makes the content, the
content is disposable and private.** Their cost scales with usage, which is why
they have to charge learners. Beating them at being them is not available to one
person.

Sagot's marginal cost per user is close to zero, because taking a sheet is
free to serve and only authoring ever touches a model. That makes a different
business possible, and it is roughly the inverse of theirs:

> **Free forever for learners. Charge the author.**

Gizmo generates questions. Sagot publishes them.

---

## Where Gizmo is structurally weak

**Authorship.** Gizmo has no real authoring story, because its content is
generated rather than written. Sagot has a format: human writable, diffable,
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
Leading with "upload a PDF, get a quiz" puts Sagot on Gizmo's axis, where
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

---

# Revision — 2026-09-18

Supersedes the sections above where they disagree. The original is kept intact
because the reasoning in it is still the reasoning; what changed is a decision
and a shipped capability.

## Decision: AI import is the headline now

The note above says, in bold, do not make AI generation the headline. That
advice was heard and overruled by the owner on 2026-09-18. The site now leads
with "upload your notes, get questions back", and the landing page is built
around that promise.

Recording the trade honestly, because it will matter later:

- **What is gained.** A promise anyone understands in four words, which is what
  a cold visitor arriving from a group chat link needs. The authoring story
  required a paragraph before it landed.
- **What is risked.** This is Gizmo's axis. They have the brand, the apps and
  the growth engine, and cannot be beaten there by one person. The defence is
  that the generated sheet lands in an **editor for review** rather than
  straight into a drill, and that the sheet is **publishable to a group** rather
  than private and disposable. Both must stay visible on the page, or the
  product is a worse Gizmo.
- **The tell that this was wrong.** People import once and never return, and
  nobody ever edits what came back. If that is the shape of the numbers after
  the pilot, move the headline back to authorship.

The wedge, however, has changed: see "Who pays" below.

## Shipped: the meter

Item 2 on the list above is done, and it turned out to be the prerequisite for
item 5 rather than a peer of it.

Before today the import route wrote **nothing** to the database. There was no
way to see who spent what, no way to cap anyone, and nothing to bill from. The
only control was that an account is cheap to make but not free.

Now:

| Piece | Where | What it does |
| --- | --- | --- |
| `imports` table | `db/schema.sql` | One row per attempt: tokens in, cached, out, cost in micro-USD, bytes, mode, model, whether it succeeded |
| `src/lib/usage.ts` | Pure arithmetic | Prices, cost, plans, allowances, periods. No database, so it is unit tested |
| `src/lib/meter.ts` | Ledger | Reads the allowance, writes the row |
| `GET /api/usage` | Readout | Plan, used, left, reads left, spend to date |
| Quota gate | `POST /api/import` | Refuses with **402** when the allowance is gone |

Three decisions worth keeping:

- **Failed reads are recorded too.** A model that ran and then returned
  something unusable has still been paid for. Counting only successes
  under-reports the bill and leaves a free way to burn tokens.
- **Money is an integer.** Micro-USD, so a year of rows sums without float
  drift.
- **Cached input is billed at the full rate.** It over-states cost slightly,
  which is the safe direction to be wrong in: a quota that bites early costs a
  person nothing, one that bites late costs the bill.

The ledger is the audit trail. Every number below is a query against it.

## Unit economics, restated per plan

Same basis as the table above: $0.30/1M input, $2.50/1M output, 57 pesos to the
dollar. At the measured mix (1078 in, 2380 out) a token costs **1.81 micro-USD**
blended, and a typical read is **3,458 tokens, about 0.36 pesos**.

| | Tokens | Reads | Inference |
| --- | --- | --- | --- |
| Free, each month | 100k | ~28 | ₱10.35 |
| A ₱49 pack | 150k | ~43 | ₱15.50 |
| A ₱199 pack | 800k | ~231 | ₱82.70 |

**The free tier is now bounded.** Worst case a free account can cost 10.35 pesos
a month, where before today one person with a textbook was an unbounded bill.
That single number is what makes the rest of this safe to publish.

## Who pays: students, sharing with students

Decided 2026-09-18, and it supersedes both the review centre wedge in the
original and the lecturer plan drafted earlier the same day.

A student turns their own reviewer into a quiz and sends it to their block. The
people taking it are other students, free and without accounts. The person who
might pay is the one who made it.

This is the most consumer-facing of the options considered, and the least
comfortable, so the trade is worth stating plainly rather than dressed up.

**What is good about it**

- **The loop is the best of the three.** A sheet sent to a block group chat is
  seen by forty classmates, and some of them have a reviewer of their own and
  the same incentive to share it. Passing reviewers around is already a ritual;
  this is a better container for something people do anyway, not a new habit to
  teach.
- **Authoring is studying.** A student has a selfish reason to make the sheet
  even if nobody else ever takes it, which means the product still works for an
  author of one. Nothing here depends on an audience showing up.
- **Serving a taker is free.** Only authoring touches a model, so the viral part
  of the loop costs nothing to run. That remains the structural advantage.

**What is hard, and it is the whole problem**

- **Students have almost no money.** This is the lowest willingness to pay of
  any customer considered. Price points are ₱50 to ₱200, impulse-sized, bought
  in exam week and not otherwise.
- **The author is the learner again.** The original document's "charge the
  author, learners free" rested on those being different people with different
  budgets. Here they are the same broke person, and the free tier is no longer
  a costless funnel into a paying customer elsewhere — it is competing with the
  thing being sold.
- **This is Gizmo's axis**, which the original warned against. The defence is
  narrow and has to be held: their content is private and disposable, and a
  sheet here is made to be handed to someone. Sharing is the product. If that
  stops being visible, this is a worse Gizmo with no app.

## Pricing: top-ups only, no subscription

Decided 2026-09-18. **There is no subscription and no recurring charge of any
kind**, including the term pass drafted earlier the same day. A person buys a
pack of reads, it never expires, and that is the entire commercial surface.

This removes more than it costs. Nothing renews, so there is no billing cycle,
no churn to manage, no cancellation flow, no failed-payment retries, no refund
policy for time not used, and no recurring-payment onboarding — which is the
part a student without a registered business cannot get through anyway.

Usage-based is also simply correct for this buyer, and this reverses the advice
given for lecturers earlier today. For a budget holder doing thirty reads a
term, metering pennies was the wrong axis. For a student cramming who will burn
twenty imports in one night, the number of reads **is** what they are buying.

| | Price | Tokens | Reads | Inference | Margin |
| --- | --- | --- | --- | --- | --- |
| Free, monthly | ₱0 | 100k | ~28 | ₱10.35 | — |
| **Small** | **₱49** | 150k | ~43 | ₱15.50 | **68%** |
| **Medium** | **₱99** | 350k | ~101 | ₱36.20 | **63%** |
| **Large** | **₱199** | 800k | ~231 | ₱82.70 | **58%** |

Bigger packs are better value per peso and thinner on margin. That is the right
shape: the person reaching for the large pack is the one who would otherwise
have hit a wall and left.

**Free resets monthly and has to stay generous.** Twenty-eight reads is most of
a term for a normal student. A paywall that bites during the sharing loop costs
more in reach than it saves in tokens.

**Free is spent before credits, always.** Nobody should spend money they did not
have to, and a balance that quietly drains while a free allowance sits unused is
the fastest way to lose the only kind of trust this has.

**Taking a sheet must never cost anything.** Free, accountless, for ever. It is
the entire growth engine.

### Getting paid without a subscription

Two phases, and the first needs no processor at all.

**Phase 1 — manual.** Somebody sends ₱49 over GCash and tells you the reference.
You add the tokens. `credit_grants` stores the reference against the tokens it
bought, so a balance can always be explained. This does not scale and does not
need to: it costs nothing to set up and answers the only question that matters,
which is whether a single person will pay anything at all. Twenty manual grants
is a better signal than any amount of planning.

**Phase 2 — a checkout link.** One-time payment links, GCash and Maya, no
recurring mandate. Check what a provider's onboarding actually asks of an
individual seller before committing to one; requirements differ and change, and
this is the step where a plan meets a compliance form.

Do not build phase 2 until phase 1 has produced money.

### The honest arithmetic

Unchanged by dropping subscriptions, and still the weakest part of the plan.

At ₱49 a pack with a 68% margin, each sale nets about ₱33. Fixed costs of
₱2,300/mo therefore need roughly **70 pack sales a month**. Consumer conversion
being what it is, that implies a few thousand monthly active authors, which at
one university is most of the campus.

Two consequences, and neither is a reason to stop:

1. **Fixed costs are a choice.** Unmonetised, this runs on free infrastructure
   tiers where breakeven is zero and the only cost is inference at about ₱10 per
   active author per month. **Vercel's Hobby tier forbids commercial use**, so
   moving to Pro has to happen on the day money is taken — not before, and not
   after.
2. **One campus is pocket money, not a business.** Real revenue needs the loop
   to cross schools, which it can: a link works anywhere, without an account.

A product that pays for itself and a little more, for a long time, is a fine
outcome for something costing ₱10 a user to run. It is only a bad one if the
plan assumed otherwise.

## What is built, and what is next

Built today:

| Piece | What it does |
| --- | --- |
| `imports` | One row per read: tokens, cost in micro-USD, bytes, mode, model, success |
| `user_credits` | Bought tokens, never expiring |
| `credit_grants` | Every grant with its payment reference, so a balance can be explained |
| `src/lib/usage.ts` | Cost, free allowance, packs, and which pocket a read comes out of. Pure, unit tested |
| `src/lib/meter.ts` | Reads the balance, writes the row, decrements credits, grants packs |
| `GET /api/usage` | What is left, and what a top-up buys |
| Quota gate | `POST /api/import` refuses with **402** when free and credits are both gone |

Next, in order:

1. **A way to grant credits** — an admin route or a script. Phase 1 above cannot
   happen without it, and it is the smallest thing on this list.
2. **A top-up screen** — the packs, and where to send the money. Needed before
   anyone can pay, and it is mostly copy.
3. **Taker to author conversion** — the single biggest lever, still missing.
   Someone who just finished a sheet a classmate sent them is the most engaged
   person on the site, and the results screen says nothing to them. It should:
   "You missed 4. Make one from your own reviewer."
4. **Unlisted sheets** — not private, which would defeat the point, but a link
   that is not indexed and not on a public list.
5. **Better reading of handwritten notes** — photos of handwriting are where
   cheap models are weakest and where students actually are. A better model,
   charged at more tokens per read, is a real reason to buy the large pack.

Item analysis and server side grading come off the list entirely. They were for
a lecturer with a class, and there is no lecturer in this plan.

## The landing page is already right

Unusually, nothing to do. The page written earlier today speaks to exactly this
person: find out what you actually know, upload your reviewer, send the link to
the group chat. It was drafted before this was the decided market and it stands.

The same goes for two other decisions made today. Leading with AI import is
correct for this audience, and requiring an account to publish is correct: the
author is the account, and the taker still needs nothing.

## Still the cheapest next step

One DLSU block, one term, no pricing and no pitch. Not a class through a
lecturer, since there is no lecturer in this plan — one group of friends who
already pass reviewers around, and watch whether a second person makes a sheet
without being asked.

That is the whole test. If sharing a sheet does not produce another author, no
pricing page was going to save it, and the `imports` ledger will at least say
what the experiment cost.

## Corrections to the sections above

- **"The wedge" is superseded.** Review centres are not the market, and neither
  are lecturers, orgs or departments. The market is students sharing with
  students.
- **The "Pricing shape" table is superseded.** There is no Author tier and no
  Institution tier, and nothing is charged monthly.
- **"Free forever for learners. Charge the author."** still describes the
  mechanics but no longer describes two different people. Read it as "taking is
  free, making in volume is paid".
- `README.md` says the stack uses **Clerk**. It is Auth.js with Google.
- "Google sign in, optional everywhere except import" is out of date. As of
  2026-09-18 **publishing requires an account**, and `/new` redirects signed-out
  visitors to sign in. Taking a sheet still needs nothing, and under this plan
  that is the entire distribution engine.
- The prices in `src/lib/usage.ts` are overridable by environment variable
  (`SAGOT_INPUT_UUSD_PER_MTOK`, `SAGOT_OUTPUT_UUSD_PER_MTOK`,
  `SAGOT_PHP_PER_USD`). Providers move prices. Re-check them against the
  provider before any money changes hands, and do not trust this file's
  arithmetic after that day.
