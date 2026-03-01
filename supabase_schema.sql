-- ─────────────────────────────────────────────────────────────────────────────
-- Baby Tracker · Supabase Schema
-- Run this entire file once in: Supabase dashboard → SQL Editor → New query
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable Row Level Security extension (usually already on)
-- Each user can only see their own data.

-- ── 1. Baby profiles ─────────────────────────────────────────────────────────
create table if not exists babies (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  dob         date not null,           -- date of birth
  sex         text not null check (sex in ('male','female')),
  birth_weight  numeric(5,2),          -- kg
  birth_length  numeric(5,1),          -- cm
  birth_hc      numeric(5,1),          -- cm head circumference
  created_at  timestamptz default now()
);

alter table babies enable row level security;

create policy "Users manage own babies"
  on babies for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 2. Growth records ────────────────────────────────────────────────────────
create table if not exists growth_records (
  id          uuid primary key default gen_random_uuid(),
  baby_id     uuid references babies(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  day         integer not null,        -- days since birth
  weight      numeric(5,2),            -- kg
  length      numeric(5,1),            -- cm
  head_circ   numeric(5,1),            -- cm
  label       text,
  note        text,
  recorded_at timestamptz default now()
);

alter table growth_records enable row level security;

create policy "Users manage own growth records"
  on growth_records for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index growth_records_baby_id_idx on growth_records(baby_id);

-- ── 3. Milestone logs ────────────────────────────────────────────────────────
create table if not exists milestone_logs (
  id              uuid primary key default gen_random_uuid(),
  baby_id         uuid references babies(id) on delete cascade not null,
  user_id         uuid references auth.users(id) on delete cascade not null,
  milestone_id    text not null,       -- e.g. "m13"
  days_from_birth integer,
  date_observed   date,
  note            text,
  logged_at       timestamptz default now(),
  unique (baby_id, milestone_id)       -- one log per milestone per baby
);

alter table milestone_logs enable row level security;

create policy "Users manage own milestone logs"
  on milestone_logs for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index milestone_logs_baby_id_idx on milestone_logs(baby_id);

-- ── 4. Share tokens (optional read-only sharing) ─────────────────────────────
create table if not exists share_tokens (
  id         uuid primary key default gen_random_uuid(),
  baby_id    uuid references babies(id) on delete cascade not null,
  user_id    uuid references auth.users(id) on delete cascade not null,
  token      text unique not null default encode(gen_random_bytes(16), 'hex'),
  label      text,                     -- e.g. "Grandma's link"
  pin_hash   text,                     -- bcrypt hash of optional 4-digit PIN (null = no PIN)
  created_at timestamptz default now(),
  expires_at timestamptz               -- null = never expires
);

alter table share_tokens enable row level security;

-- Owner can manage their share tokens
create policy "Users manage own share tokens"
  on share_tokens for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Anyone with a valid token can read the associated baby (for shared view)
create policy "Public token read"
  on share_tokens for select
  using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- If you already ran this schema before and need to add the PIN column, run:
-- ALTER TABLE share_tokens ADD COLUMN IF NOT EXISTS pin_hash text;

-- Done! Go back to the app and fill in your .env.local keys.
-- ─────────────────────────────────────────────────────────────────────────────
