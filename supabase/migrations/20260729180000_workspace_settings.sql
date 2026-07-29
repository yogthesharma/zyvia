-- Workspace settings: logo, fiscal year, immutable region, scheduled deletion

alter table public.workspaces
  add column if not exists logo_url text,
  add column if not exists fiscal_year_start_month smallint not null default 1,
  add column if not exists region text not null default 'Asia Pacific',
  add column if not exists deletion_scheduled_at timestamptz;

alter table public.workspaces
  drop constraint if exists workspaces_fiscal_year_start_month_range;

alter table public.workspaces
  add constraint workspaces_fiscal_year_start_month_range
  check (fiscal_year_start_month between 1 and 12);

alter table public.workspaces
  drop constraint if exists workspaces_region_nonempty;

alter table public.workspaces
  add constraint workspaces_region_nonempty
  check (char_length(trim(region)) > 0);

-- Region is set at creation and must not change afterward.
create or replace function private.workspaces_preserve_region()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.region is distinct from old.region then
    raise exception 'Workspace region cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists workspaces_preserve_region on public.workspaces;

create trigger workspaces_preserve_region
  before update on public.workspaces
  for each row
  execute function private.workspaces_preserve_region();

-- Bootstrap with region from app (falls back to Asia Pacific for this project).
create or replace function public.create_workspace(
  p_name text,
  p_slug text,
  p_region text default null
)
returns public.workspaces
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  ws public.workspaces;
  region_label text := nullif(trim(coalesce(p_region, '')), '');
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Workspace name is required';
  end if;

  if p_slug is null or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Invalid workspace slug';
  end if;

  if region_label is null then
    region_label := 'Asia Pacific';
  end if;

  insert into public.workspaces (name, slug, created_by, region)
  values (trim(p_name), p_slug, uid, region_label)
  returning * into ws;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws.id, uid, 'owner');

  return ws;
end;
$$;

revoke all on function public.create_workspace(text, text, text) from public;
grant execute on function public.create_workspace(text, text, text) to authenticated;

-- Keep 2-arg overload working for any older callers.
create or replace function public.create_workspace(p_name text, p_slug text)
returns public.workspaces
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.create_workspace(p_name, p_slug, null);
end;
$$;

revoke all on function public.create_workspace(text, text) from public;
grant execute on function public.create_workspace(text, text) to authenticated;

-- Owners can hard-delete a workspace (cascades memberships / teams / issues).
create policy "workspaces_delete_owner"
  on public.workspaces for delete to authenticated
  using (private.workspace_role(id) = 'owner');

-- Workspace logo storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'workspace-logos',
  'workspace-logos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "workspace_logos_public_read"
  on storage.objects for select
  using (bucket_id = 'workspace-logos');

create policy "workspace_logos_insert_admin"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'workspace-logos'
    and private.workspace_role((storage.foldername(name))[1]::uuid) in ('owner', 'admin')
  );

create policy "workspace_logos_update_admin"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'workspace-logos'
    and private.workspace_role((storage.foldername(name))[1]::uuid) in ('owner', 'admin')
  )
  with check (
    bucket_id = 'workspace-logos'
    and private.workspace_role((storage.foldername(name))[1]::uuid) in ('owner', 'admin')
  );

create policy "workspace_logos_delete_admin"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'workspace-logos'
    and private.workspace_role((storage.foldername(name))[1]::uuid) in ('owner', 'admin')
  );
