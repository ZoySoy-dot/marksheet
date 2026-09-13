-- Marksheet schema (Neon Postgres)

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

create index if not exists attempts_quiz_id_idx on attempts (quiz_id);

create index if not exists quizzes_created_at_idx on quizzes (created_at desc);

create index if not exists quizzes_owner_id_idx on quizzes (owner_id, created_at desc);
