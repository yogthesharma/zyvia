-- Keep former workspace slugs so /w/<old-slug>/... can redirect to the current URL.

create table public.workspace_slug_aliases (
  slug text primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint workspace_slug_aliases_slug_format
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint workspace_slug_aliases_slug_length
    check (char_length(slug) between 2 and 48)
);

create index workspace_slug_aliases_workspace_id_idx
  on public.workspace_slug_aliases (workspace_id);

alter table public.workspace_slug_aliases enable row level security;

-- Members can read aliases for their workspaces (layout redirect lookup).
create policy "workspace_slug_aliases_select_member"
  on public.workspace_slug_aliases for select to authenticated
  using (workspace_id in (select private.user_workspace_ids()));

-- Writes happen via trigger (security definer); no direct client inserts.
revoke insert, update, delete on public.workspace_slug_aliases from authenticated;
grant select on public.workspace_slug_aliases to authenticated;

-- Resolve an old slug to the workspace's current slug (for redirects).
create or replace function public.current_workspace_slug_for_alias(p_slug text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select w.slug
  from public.workspace_slug_aliases a
  join public.workspaces w on w.id = a.workspace_id
  where a.slug = p_slug
  limit 1;
$$;

revoke all on function public.current_workspace_slug_for_alias(text) from public;
grant execute on function public.current_workspace_slug_for_alias(text) to authenticated;

-- On rename: reserve the old slug, reclaim own former aliases, block taken aliases.
create or replace function private.workspaces_record_slug_alias()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if exists (
      select 1
      from public.workspace_slug_aliases a
      where a.slug = new.slug
    ) then
      raise exception 'That workspace URL is already taken'
        using errcode = 'unique_violation';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and new.slug is distinct from old.slug then
    -- Reclaim if this workspace is taking back one of its own former slugs.
    delete from public.workspace_slug_aliases
    where workspace_id = new.id
      and slug = new.slug;

    if exists (
      select 1
      from public.workspace_slug_aliases a
      where a.slug = new.slug
        and a.workspace_id <> new.id
    ) then
      raise exception 'That workspace URL is already taken'
        using errcode = 'unique_violation';
    end if;

    insert into public.workspace_slug_aliases (slug, workspace_id)
    values (old.slug, new.id)
    on conflict (slug) do update
      set workspace_id = excluded.workspace_id,
          created_at = timezone('utc', now());
  end if;

  return new;
end;
$$;

drop trigger if exists workspaces_record_slug_alias on public.workspaces;

create trigger workspaces_record_slug_alias
  before insert or update of slug on public.workspaces
  for each row
  execute function private.workspaces_record_slug_alias();
