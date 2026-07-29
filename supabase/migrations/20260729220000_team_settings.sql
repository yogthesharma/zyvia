-- Per-team settings: visibility, estimates, hierarchy, triage, lifecycle.

alter table public.teams
  add column if not exists visibility text not null default 'workspace',
  add column if not exists estimation_scale text not null default 'none',
  add column if not exists parent_team_id uuid references public.teams (id) on delete set null,
  add column if not exists triage_enabled boolean not null default false,
  add column if not exists retired_at timestamptz,
  add column if not exists deleted_at timestamptz;

alter table public.teams
  drop constraint if exists teams_visibility_check;
alter table public.teams
  add constraint teams_visibility_check
  check (visibility in ('workspace', 'private'));

alter table public.teams
  drop constraint if exists teams_estimation_scale_check;
alter table public.teams
  add constraint teams_estimation_scale_check
  check (
    estimation_scale in (
      'none',
      'exponential',
      'fibonacci',
      'linear',
      'tshirt'
    )
  );

alter table public.teams
  drop constraint if exists teams_parent_not_self;
alter table public.teams
  add constraint teams_parent_not_self
  check (parent_team_id is distinct from id);

alter table public.teams
  drop constraint if exists teams_lifecycle_order;
alter table public.teams
  add constraint teams_lifecycle_order
  check (
    deleted_at is null
    or retired_at is null
    or deleted_at >= retired_at
  );

create index if not exists teams_workspace_lifecycle_idx
  on public.teams (workspace_id, deleted_at, retired_at);

create index if not exists teams_parent_team_id_idx
  on public.teams (parent_team_id);

-- Parent must live in the same workspace.
create or replace function public.teams_enforce_parent_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_workspace uuid;
begin
  if new.parent_team_id is null then
    return new;
  end if;

  select t.workspace_id into parent_workspace
  from public.teams t
  where t.id = new.parent_team_id;

  if parent_workspace is null then
    raise exception 'Parent team not found';
  end if;

  if parent_workspace is distinct from new.workspace_id then
    raise exception 'Parent team must belong to the same workspace';
  end if;

  if exists (
    select 1
    from public.teams t
    where t.id = new.parent_team_id
      and t.deleted_at is not null
  ) then
    raise exception 'Parent team is deleted';
  end if;

  return new;
end;
$$;

drop trigger if exists teams_enforce_parent_workspace on public.teams;
create trigger teams_enforce_parent_workspace
before insert or update of parent_team_id, workspace_id
on public.teams
for each row execute function public.teams_enforce_parent_workspace();
