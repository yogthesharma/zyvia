-- Profile fields + avatar storage + self-leave membership

alter table public.profiles
  add column if not exists username text,
  add column if not exists title text;

-- Unique usernames (case-insensitive via lowercase constraint)
alter table public.profiles
  drop constraint if exists profiles_username_format;

alter table public.profiles
  add constraint profiles_username_format
  check (
    username is null
    or username ~ '^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$'
    or username ~ '^[a-z0-9]{2,30}$'
  );

create unique index if not exists profiles_username_uidx
  on public.profiles (username)
  where username is not null;

-- Backfill usernames from auth email local-part where missing
with candidates as (
  select
    p.id,
    lower(regexp_replace(split_part(u.email, '@', 1), '[^a-z0-9_-]', '', 'g')) as base
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.username is null
    and u.email is not null
)
update public.profiles p
set username = case
  when length(c.base) < 2 then 'user' || substr(replace(p.id::text, '-', ''), 1, 6)
  when length(c.base) > 30 then left(c.base, 30)
  else c.base
end
from candidates c
where p.id = c.id
  and not exists (
    select 1 from public.profiles other
    where other.username = case
      when length(c.base) < 2 then 'user' || substr(replace(p.id::text, '-', ''), 1, 6)
      when length(c.base) > 30 then left(c.base, 30)
      else c.base
    end
  );

-- Allow members to remove themselves from a workspace
create policy "workspace_members_delete_self"
  on public.workspace_members for delete to authenticated
  using (user_id = (select auth.uid()));

-- Avatar storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
