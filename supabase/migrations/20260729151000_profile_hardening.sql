-- Profile feature hardening: reliable email lookup + username sanitize

create or replace function public.auth_email_taken(p_email text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    where lower(u.email) = lower(p_email)
  );
$$;

revoke all on function public.auth_email_taken(text) from public;
grant execute on function public.auth_email_taken(text) to authenticated;

-- Tighten username format: must start/end alphanumeric; 2–30 chars
alter table public.profiles
  drop constraint if exists profiles_username_format;

alter table public.profiles
  add constraint profiles_username_format
  check (
    username is null
    or username ~ '^[a-z0-9]{2,30}$'
    or username ~ '^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$'
  );

-- Fix any usernames that violate the tightened format (e.g. truncated backfills)
update public.profiles
set username = null
where username is not null
  and username !~ '^[a-z0-9]{2,30}$'
  and username !~ '^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$';
