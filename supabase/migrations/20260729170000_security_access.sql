-- Security & access: device sessions + personal API keys

create table public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_key text not null,
  user_agent text,
  ip text,
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  constraint user_sessions_user_session_unique unique (user_id, session_key)
);

create index user_sessions_user_id_idx on public.user_sessions (user_id);
create index user_sessions_active_idx
  on public.user_sessions (user_id, last_seen_at desc)
  where revoked_at is null;

alter table public.user_sessions enable row level security;

create policy "user_sessions_select_own"
  on public.user_sessions for select to authenticated
  using (user_id = (select auth.uid()));

create policy "user_sessions_insert_own"
  on public.user_sessions for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "user_sessions_update_own"
  on public.user_sessions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create table public.personal_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null,
  last_used_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  constraint personal_api_keys_name_length check (
    char_length(trim(name)) between 1 and 80
  )
);

create unique index personal_api_keys_hash_uidx on public.personal_api_keys (key_hash);
create index personal_api_keys_user_id_idx on public.personal_api_keys (user_id);
create index personal_api_keys_active_idx
  on public.personal_api_keys (user_id, created_at desc)
  where revoked_at is null;

alter table public.personal_api_keys enable row level security;

create policy "personal_api_keys_select_own"
  on public.personal_api_keys for select to authenticated
  using (user_id = (select auth.uid()));

create policy "personal_api_keys_insert_own"
  on public.personal_api_keys for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "personal_api_keys_update_own"
  on public.personal_api_keys for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
