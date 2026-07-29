-- Issue + project status settings: description, duplicate category, UPDATE RLS,
-- project_statuses table, and default seeds.

-- ---------------------------------------------------------------------------
-- Issue workflow_states: description + duplicate category
-- ---------------------------------------------------------------------------

alter table public.workflow_states
  add column if not exists description text not null default '';

alter table public.workflow_states
  drop constraint if exists workflow_states_description_length;

alter table public.workflow_states
  add constraint workflow_states_description_length
  check (char_length(description) <= 500);

alter table public.workflow_states
  drop constraint if exists workflow_states_color_hex;

alter table public.workflow_states
  add constraint workflow_states_color_hex
  check (color is null or color ~ '^#[0-9A-Fa-f]{6}$');

alter table public.workflow_states
  drop constraint if exists workflow_states_category_check;

alter table public.workflow_states
  drop constraint if exists workflow_states_category_check1;

-- Init migration named the check inline; Postgres may auto-name it.
do $$
declare
  constr text;
begin
  select c.conname into constr
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'workflow_states'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%category%';

  if constr is not null then
    execute format('alter table public.workflow_states drop constraint %I', constr);
  end if;
end;
$$;

alter table public.workflow_states
  add constraint workflow_states_category_check
  check (
    category in (
      'backlog',
      'unstarted',
      'started',
      'completed',
      'canceled',
      'duplicate'
    )
  );

create unique index if not exists workflow_states_team_name_unique
  on public.workflow_states (team_id, lower(trim(name)));

create index if not exists workflow_states_team_category_position_idx
  on public.workflow_states (team_id, category, position);

-- UPDATE RLS (managers: workspace owner/admin or team owner/admin)
drop policy if exists "workflow_states_update_manager" on public.workflow_states;
create policy "workflow_states_update_manager"
  on public.workflow_states for update to authenticated
  using (
    private.is_workspace_member((
      select t.workspace_id from public.teams t where t.id = team_id
    ))
    and (
      private.workspace_role((
        select t.workspace_id from public.teams t where t.id = team_id
      )) in ('owner', 'admin')
      or private.team_role(team_id) in ('owner', 'admin')
    )
  )
  with check (
    private.is_workspace_member((
      select t.workspace_id from public.teams t where t.id = team_id
    ))
    and (
      private.workspace_role((
        select t.workspace_id from public.teams t where t.id = team_id
      )) in ('owner', 'admin')
      or private.team_role(team_id) in ('owner', 'admin')
    )
  );

-- Tighten insert/delete to managers (keep select for members)
drop policy if exists "workflow_states_insert_via_team" on public.workflow_states;
create policy "workflow_states_insert_manager"
  on public.workflow_states for insert to authenticated
  with check (
    private.is_workspace_member((
      select t.workspace_id from public.teams t where t.id = team_id
    ))
    and (
      private.workspace_role((
        select t.workspace_id from public.teams t where t.id = team_id
      )) in ('owner', 'admin')
      or private.team_role(team_id) in ('owner', 'admin')
    )
  );

drop policy if exists "workflow_states_delete_member" on public.workflow_states;
create policy "workflow_states_delete_manager"
  on public.workflow_states for delete to authenticated
  using (
    private.is_workspace_member((
      select t.workspace_id from public.teams t where t.id = team_id
    ))
    and (
      private.workspace_role((
        select t.workspace_id from public.teams t where t.id = team_id
      )) in ('owner', 'admin')
      or private.team_role(team_id) in ('owner', 'admin')
    )
  );

-- Default seed includes Duplicate
create or replace function public.seed_default_workflow_states()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.workflow_states (
    team_id, name, description, category, position, is_default, color
  )
  values
    (new.id, 'Backlog', '', 'backlog', 0, false, '#94a3b8'),
    (new.id, 'Todo', '', 'unstarted', 0, true, '#a78bfa'),
    (new.id, 'In Progress', '', 'started', 0, false, '#60a5fa'),
    (new.id, 'Done', '', 'completed', 0, false, '#34d399'),
    (new.id, 'Canceled', '', 'canceled', 0, false, '#f87171'),
    (new.id, 'Duplicate', '', 'duplicate', 0, false, '#94a3b8');
  return new;
end;
$$;

-- Backfill Duplicate for existing teams that lack that category
insert into public.workflow_states (team_id, name, description, category, position, is_default, color)
select t.id, 'Duplicate', '', 'duplicate', 0, false, '#94a3b8'
from public.teams t
where not exists (
  select 1
  from public.workflow_states ws
  where ws.team_id = t.id
    and ws.category = 'duplicate'
);

-- ---------------------------------------------------------------------------
-- Project statuses (workspace-scoped)
-- ---------------------------------------------------------------------------

create table if not exists public.project_statuses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  description text not null default '',
  category text not null
    check (
      category in (
        'backlog',
        'planned',
        'started',
        'completed',
        'canceled'
      )
    ),
  position integer not null default 0,
  is_default boolean not null default false,
  color text not null default '#94a3b8'
    check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint project_statuses_name_length
    check (char_length(trim(name)) between 1 and 80),
  constraint project_statuses_description_length
    check (char_length(description) <= 500)
);

create unique index if not exists project_statuses_workspace_name_unique
  on public.project_statuses (workspace_id, lower(trim(name)));

create unique index if not exists project_statuses_one_default_uidx
  on public.project_statuses (workspace_id)
  where is_default;

create index if not exists project_statuses_workspace_category_position_idx
  on public.project_statuses (workspace_id, category, position);

drop trigger if exists project_statuses_set_updated_at on public.project_statuses;
create trigger project_statuses_set_updated_at
before update on public.project_statuses
for each row execute function public.set_updated_at();

alter table public.project_statuses enable row level security;

drop policy if exists "project_statuses_select_member" on public.project_statuses;
create policy "project_statuses_select_member"
  on public.project_statuses for select to authenticated
  using (private.is_workspace_member(workspace_id));

drop policy if exists "project_statuses_insert_admin" on public.project_statuses;
create policy "project_statuses_insert_admin"
  on public.project_statuses for insert to authenticated
  with check (private.workspace_role(workspace_id) in ('owner', 'admin'));

drop policy if exists "project_statuses_update_admin" on public.project_statuses;
create policy "project_statuses_update_admin"
  on public.project_statuses for update to authenticated
  using (private.workspace_role(workspace_id) in ('owner', 'admin'))
  with check (private.workspace_role(workspace_id) in ('owner', 'admin'));

drop policy if exists "project_statuses_delete_admin" on public.project_statuses;
create policy "project_statuses_delete_admin"
  on public.project_statuses for delete to authenticated
  using (private.workspace_role(workspace_id) in ('owner', 'admin'));

create or replace function public.seed_default_project_statuses(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.project_statuses ps where ps.workspace_id = p_workspace_id
  ) then
    return;
  end if;

  insert into public.project_statuses (
    workspace_id, name, description, category, position, is_default, color
  )
  values
    (p_workspace_id, 'Backlog', '', 'backlog', 0, true, '#94a3b8'),
    (p_workspace_id, 'Planned', '', 'planned', 0, false, '#a78bfa'),
    (p_workspace_id, 'In Progress', '', 'started', 0, false, '#60a5fa'),
    (p_workspace_id, 'Completed', '', 'completed', 0, false, '#34d399'),
    (p_workspace_id, 'Canceled', '', 'canceled', 0, false, '#f87171');
end;
$$;

revoke all on function public.seed_default_project_statuses(uuid) from public;
grant execute on function public.seed_default_project_statuses(uuid) to authenticated;

-- Backfill existing workspaces
select public.seed_default_project_statuses(w.id)
from public.workspaces w
where not exists (
  select 1 from public.project_statuses ps where ps.workspace_id = w.id
);

-- Seed on workspace create
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

  if length(trim(p_name)) > 80 then
    raise exception 'Workspace name is too long';
  end if;

  if p_slug is null
     or char_length(p_slug) < 2
     or char_length(p_slug) > 48
     or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
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

  perform public.seed_default_project_statuses(ws.id);

  return ws;
end;
$$;
