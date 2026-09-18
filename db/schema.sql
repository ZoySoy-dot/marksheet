-- Sagot schema (Neon Postgres). Safe to re-run.

create table if not exists quizzes (
  id             bigserial primary key,
  slug           text not null unique,
  edit_token     text not null,
  owner_id       text,
  title          text not null,
  source         text not null,
  questions      jsonb not null,
  question_count integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Added after launch: sheets published before accounts existed have no owner
-- and stay reachable through their edit token.
alter table quizzes add column if not exists owner_id text;

create table if not exists attempts (
  id         bigserial primary key,
  quiz_id    bigint not null references quizzes(id) on delete cascade,
  score      integer not null,
  total      integer not null,
  created_at timestamptz not null default now()
);

-- Leaderboard columns. user_id stays null for anyone taking a sheet without an
-- account: they still get a score, they just do not appear in the standings.
alter table attempts add column if not exists user_id text;
alter table attempts add column if not exists display_name text;
alter table attempts add column if not exists points integer not null default 0;
alter table attempts add column if not exists duration_ms integer;

create index if not exists attempts_quiz_id_idx on attempts (quiz_id);
create index if not exists attempts_board_idx on attempts (quiz_id, points desc);

-- One row per question per person, holding that card's FSRS state.
-- card_key is derived from the question text, so it survives reordering.
create table if not exists cards (
  id              bigserial primary key,
  user_id         text not null,
  quiz_id         bigint not null references quizzes(id) on delete cascade,
  card_key        text not null,
  due             timestamptz not null,
  stability       double precision not null default 0,
  difficulty      double precision not null default 0,
  elapsed_days    integer not null default 0,
  scheduled_days  integer not null default 0,
  reps            integer not null default 0,
  lapses          integer not null default 0,
  state           smallint not null default 0,
  last_review     timestamptz,
  updated_at      timestamptz not null default now(),
  unique (user_id, quiz_id, card_key)
);

create index if not exists cards_due_idx on cards (user_id, due);

create table if not exists review_log (
  id             bigserial primary key,
  card_id        bigint not null references cards(id) on delete cascade,
  rating         smallint not null,
  state          smallint not null,
  elapsed_ms     integer,
  correct        boolean,
  scheduled_days integer,
  reviewed_at    timestamptz not null default now()
);

create index if not exists review_log_card_idx on review_log (card_id, reviewed_at desc);

create index if not exists quizzes_created_at_idx on quizzes (created_at desc);
create index if not exists quizzes_owner_id_idx on quizzes (owner_id, created_at desc);

-- A sheet someone wants to come back to, including sheets they did not write.
-- Publishing already records authorship on quizzes.owner_id. This is the
-- separate act of keeping a link a classmate sent you.
create table if not exists saved_quizzes (
  user_id  text not null,
  quiz_id  bigint not null references quizzes(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, quiz_id)
);

create index if not exists saved_quizzes_user_idx on saved_quizzes (user_id, saved_at desc);

-- A run in progress. Doubles as the resume point and the live presence signal:
-- a row with no finished_at whose last_seen_at is recent means that person is
-- taking the sheet right now. State is keyed by card_key rather than by
-- question position, so editing the sheet mid-run cannot scramble it.
create table if not exists runs (
  id           bigserial primary key,
  user_id      text not null,
  quiz_id      bigint not null references quizzes(id) on delete cascade,
  display_name text,
  order_keys   text[] not null default '{}',
  picks        jsonb not null default '{}'::jsonb,
  written      jsonb not null default '{}'::jsonb,
  revealed     jsonb not null default '{}'::jsonb,
  timings      jsonb not null default '{}'::jsonb,
  position     integer not null default 0,
  mode         text not null default 'reviewer',
  started_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  finished_at  timestamptz,
  unique (user_id, quiz_id)
);

create index if not exists runs_live_idx on runs (quiz_id, last_seen_at desc);

-- The leaderboard shows other people, and we only ever hold the browsing
-- user's session, so a picture has to be recorded when they finish a run.
alter table attempts add column if not exists image_url text;
alter table runs     add column if not exists image_url text;
alter table runs     add column if not exists written jsonb not null default '{}'::jsonb;

-- Who wrote it, recorded at publish time. The quiz page shows other people's
-- work, and we only ever hold the browsing user's session.
alter table quizzes add column if not exists owner_name text;
alter table quizzes add column if not exists owner_image text;

-- ---------------------------------------------------------------------------
-- Usage metering
--
-- Reading a document is the only thing here that costs real money, and until
-- now it left no trace at all: no way to see who spent what, no way to cap
-- anyone, and nothing to bill from. One row per attempt, written whether or not
-- the read succeeded, because a failed read still burns tokens.
-- ---------------------------------------------------------------------------
create table if not exists imports (
  id             bigserial primary key,
  user_id        text not null,
  mode           text not null,
  filename       text,
  media_type     text,
  file_bytes     integer not null default 0,
  model          text not null,
  input_tokens   integer not null default 0,
  cached_tokens  integer not null default 0,
  output_tokens  integer not null default 0,
  total_tokens   integer not null default 0,
  -- Money as an integer. Millionths of a USD, so summing a year of rows never
  -- drifts the way repeated float addition does.
  cost_micro_usd bigint not null default 0,
  question_count integer not null default 0,
  ok             boolean not null default true,
  created_at     timestamptz not null default now()
);

-- The quota question is always "this person, since this date", so the index
-- matches it exactly.
create index if not exists imports_user_idx on imports (user_id, created_at desc);

-- Bought reads.
--
-- There is no subscription and no plan: a person tops up a balance and it sits
-- here until it is used. Nothing renews, nothing lapses, and nothing has to be
-- cancelled, which is the point. The free monthly allowance is not stored, it
-- is computed from the imports ledger.
create table if not exists user_credits (
  user_id          text primary key,
  tokens_remaining bigint not null default 0,
  updated_at       timestamptz not null default now()
);

-- Every grant, so a balance can always be explained.
--
-- `reference` is the idempotency key and is required. For a PayMongo purchase
-- it is the checkout session id; for a manual grant it is whatever the person
-- granting invents. PayMongo retries a failed webhook up to twelve times, so
-- duplicates are normal rather than exceptional, and the unique constraint is
-- what stops the twelfth delivery granting a twelfth pack.
create table if not exists credit_grants (
  id         bigserial primary key,
  user_id    text not null,
  tokens     bigint not null,
  amount_php integer not null default 0,
  pack       text,
  reference  text not null unique,
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists credit_grants_user_idx on credit_grants (user_id, created_at desc);
