-- Labels settings: groups, team/workspace scope, issue vs project kind, archive.

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------

alter table public.labels
  add column if not exists description text not null default '',
  add column if not exists kind text not null default 'issue',
  add column if not exists is_group boolean not null default false,
  add column if not exists parent_id uuid references public.labels (id) on delete cascade,
  add column if not exists team_id uuid references public.teams (id) on delete cascade,
  add column if not exists position integer not null default 0,
  add column if not exists archived_at timestamptz,
  add column if not exists last_applied_at timestamptz,
  add column if not exists created_by uuid references public.profiles (id) on delete set null,
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.labels
  drop constraint if exists labels_workspace_name_unique;

alter table public.labels
  drop constraint if exists labels_kind_check;

alter table public.labels
  add constraint labels_kind_check
    check (kind in ('issue', 'project'));

alter table public.labels
  drop constraint if exists labels_name_length;

alter table public.labels
  add constraint labels_name_length
    check (char_length(trim(name)) between 1 and 80);

alter table public.labels
  drop constraint if exists labels_description_length;

alter table public.labels
  add constraint labels_description_length
    check (char_length(description) <= 500);

alter table public.labels
  drop constraint if exists labels_color_hex;

alter table public.labels
  add constraint labels_color_hex
    check (color ~ '^#[0-9A-Fa-f]{6}$');

alter table public.labels
  drop constraint if exists labels_project_no_team;

alter table public.labels
  add constraint labels_project_no_team
    check (kind <> 'project' or team_id is null);

alter table public.labels
  drop constraint if exists labels_group_no_parent;

alter table public.labels
  add constraint labels_group_no_parent
    check (not is_group or parent_id is null);

-- Unique name among siblings (same workspace / kind / team / parent), including archived.
create unique index if not exists labels_sibling_name_unique
  on public.labels (
    workspace_id,
    kind,
    coalesce(team_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(trim(name))
  );

create index if not exists labels_workspace_kind_idx
  on public.labels (workspace_id, kind, team_id, parent_id, position);

create index if not exists labels_team_idx
  on public.labels (team_id, kind, position)
  where team_id is not null;

create index if not exists labels_parent_idx
  on public.labels (parent_id, position)
  where parent_id is not null;

create index if not exists labels_archived_idx
  on public.labels (workspace_id, kind, archived_at)
  where archived_at is not null;

-- updated_at trigger (shared helper from workspace settings)
drop trigger if exists labels_set_updated_at on public.labels;
create trigger labels_set_updated_at
before update on public.labels
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Guards
-- ---------------------------------------------------------------------------

create or replace function private.labels_team_workspace_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  team_workspace uuid;
begin
  if new.team_id is null then
    return new;
  end if;

  select t.workspace_id into team_workspace
  from public.teams t
  where t.id = new.team_id;

  if team_workspace is null then
    raise exception 'Team not found for label';
  end if;

  if team_workspace <> new.workspace_id then
    raise exception 'Label team must belong to the same workspace';
  end if;

  return new;
end;
$$;

revoke all on function private.labels_team_workspace_guard() from public;

drop trigger if exists labels_team_workspace_guard on public.labels;
create trigger labels_team_workspace_guard
before insert or update of team_id, workspace_id on public.labels
for each row execute function private.labels_team_workspace_guard();

create or replace function private.labels_parent_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_row public.labels%rowtype;
  child_count integer;
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.is_group then
    raise exception 'Label groups cannot be nested';
  end if;

  select * into parent_row
  from public.labels
  where id = new.parent_id;

  if parent_row.id is null then
    raise exception 'Parent label group not found';
  end if;

  if not parent_row.is_group then
    raise exception 'Parent must be a label group';
  end if;

  if parent_row.workspace_id <> new.workspace_id
     or parent_row.kind <> new.kind
     or parent_row.team_id is distinct from new.team_id then
    raise exception 'Label must match parent group scope';
  end if;

  if parent_row.archived_at is not null and new.archived_at is null then
    raise exception 'Cannot add an active label to an archived group';
  end if;

  select count(*)::integer into child_count
  from public.labels
  where parent_id = new.parent_id
    and id is distinct from new.id;

  if child_count >= 250 then
    raise exception 'Label groups are limited to 250 labels';
  end if;

  return new;
end;
$$;

revoke all on function private.labels_parent_guard() from public;

drop trigger if exists labels_parent_guard on public.labels;
create trigger labels_parent_guard
before insert or update of parent_id, is_group, workspace_id, kind, team_id, archived_at
on public.labels
for each row execute function private.labels_parent_guard();

-- ---------------------------------------------------------------------------
-- RLS (replace open member write with admin / team-manager write)
-- ---------------------------------------------------------------------------

drop policy if exists "labels_select_member" on public.labels;
drop policy if exists "labels_write_member" on public.labels;

create policy "labels_select_member"
  on public.labels for select to authenticated
  using (private.is_workspace_member(workspace_id));

create policy "labels_insert_manager"
  on public.labels for insert to authenticated
  with check (
    private.is_workspace_member(workspace_id)
    and (
      (
        team_id is null
        and private.workspace_role(workspace_id) in ('owner', 'admin')
      )
      or (
        team_id is not null
        and (
          private.workspace_role(workspace_id) in ('owner', 'admin')
          or private.team_role(team_id) in ('owner', 'admin')
        )
      )
    )
  );

create policy "labels_update_manager"
  on public.labels for update to authenticated
  using (
    private.is_workspace_member(workspace_id)
    and (
      (
        team_id is null
        and private.workspace_role(workspace_id) in ('owner', 'admin')
      )
      or (
        team_id is not null
        and (
          private.workspace_role(workspace_id) in ('owner', 'admin')
          or private.team_role(team_id) in ('owner', 'admin')
        )
      )
    )
  )
  with check (
    private.is_workspace_member(workspace_id)
    and (
      (
        team_id is null
        and private.workspace_role(workspace_id) in ('owner', 'admin')
      )
      or (
        team_id is not null
        and (
          private.workspace_role(workspace_id) in ('owner', 'admin')
          or private.team_role(team_id) in ('owner', 'admin')
        )
      )
    )
  );

create policy "labels_delete_manager"
  on public.labels for delete to authenticated
  using (
    private.is_workspace_member(workspace_id)
    and (
      (
        team_id is null
        and private.workspace_role(workspace_id) in ('owner', 'admin')
      )
      or (
        team_id is not null
        and (
          private.workspace_role(workspace_id) in ('owner', 'admin')
          or private.team_role(team_id) in ('owner', 'admin')
        )
      )
    )
  );
