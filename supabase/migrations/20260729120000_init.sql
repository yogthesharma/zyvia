-- Zyvia iteration 1: multi-tenant core schema + RLS

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  theme text not null default 'dark' check (theme in ('light', 'dark', 'system')),
  onboarding_step text not null default 'profile'
    check (onboarding_step in ('profile', 'workspace', 'team', 'theme', 'invite', 'done')),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Workspaces & membership
-- ---------------------------------------------------------------------------

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint workspaces_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint workspaces_slug_length check (char_length(slug) between 2 and 48)
);

create unique index workspaces_slug_uidx on public.workspaces (slug);

create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_id_idx on public.workspace_members (user_id);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  invited_by uuid references auth.users (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default timezone('utc', now()),
  constraint invites_email_lower check (email = lower(email))
);

create unique index invites_pending_email_uidx
  on public.invites (workspace_id, email)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- Teams & workflow
-- ---------------------------------------------------------------------------

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  key text not null,
  issue_counter integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint teams_key_format check (key ~ '^[A-Z]{2,4}$'),
  constraint teams_workspace_key_unique unique (workspace_id, key)
);

create index teams_workspace_id_idx on public.teams (workspace_id);

create trigger teams_set_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

create table public.workflow_states (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  name text not null,
  category text not null
    check (category in ('backlog', 'unstarted', 'started', 'completed', 'canceled')),
  position integer not null default 0,
  is_default boolean not null default false,
  color text,
  created_at timestamptz not null default timezone('utc', now())
);

create index workflow_states_team_id_idx on public.workflow_states (team_id);

create unique index workflow_states_one_default_uidx
  on public.workflow_states (team_id)
  where is_default;

create or replace function public.seed_default_workflow_states()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.workflow_states (team_id, name, category, position, is_default, color)
  values
    (new.id, 'Backlog', 'backlog', 0, false, '#94a3b8'),
    (new.id, 'Todo', 'unstarted', 1, true, '#a78bfa'),
    (new.id, 'In Progress', 'started', 2, false, '#60a5fa'),
    (new.id, 'Done', 'completed', 3, false, '#34d399'),
    (new.id, 'Canceled', 'canceled', 4, false, '#f87171');
  return new;
end;
$$;

create trigger teams_seed_workflow
after insert on public.teams
for each row execute function public.seed_default_workflow_states();

-- ---------------------------------------------------------------------------
-- Issues
-- ---------------------------------------------------------------------------

create table public.issues (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  number integer not null,
  title text not null,
  description text,
  status_id uuid not null references public.workflow_states (id),
  priority smallint not null default 0 check (priority between 0 and 4),
  assignee_id uuid references auth.users (id) on delete set null,
  creator_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint issues_team_number_unique unique (team_id, number)
);

create index issues_workspace_id_idx on public.issues (workspace_id);
create index issues_team_id_idx on public.issues (team_id);
create index issues_status_id_idx on public.issues (status_id);
create index issues_assignee_id_idx on public.issues (assignee_id);

create trigger issues_set_updated_at
before update on public.issues
for each row execute function public.set_updated_at();

create or replace function public.assign_issue_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_number integer;
begin
  update public.teams
  set issue_counter = issue_counter + 1
  where id = new.team_id
  returning issue_counter into next_number;

  new.number := next_number;
  return new;
end;
$$;

create trigger issues_assign_number
before insert on public.issues
for each row
when (new.number is null or new.number = 0)
execute function public.assign_issue_number();

-- ---------------------------------------------------------------------------
-- Labels (optional but included)
-- ---------------------------------------------------------------------------

create table public.labels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  color text not null default '#64748b',
  created_at timestamptz not null default timezone('utc', now()),
  constraint labels_workspace_name_unique unique (workspace_id, name)
);

create table public.issue_labels (
  issue_id uuid not null references public.issues (id) on delete cascade,
  label_id uuid not null references public.labels (id) on delete cascade,
  primary key (issue_id, label_id)
);

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

create or replace function private.user_workspace_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select workspace_id
  from public.workspace_members
  where user_id = (select auth.uid());
$$;

revoke all on function private.user_workspace_ids() from public;
grant execute on function private.user_workspace_ids() to authenticated;

create or replace function private.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = p_workspace_id
      and user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_workspace_member(uuid) from public;
grant execute on function private.is_workspace_member(uuid) to authenticated;

create or replace function private.workspace_role(p_workspace_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.workspace_members
  where workspace_id = p_workspace_id
    and user_id = (select auth.uid())
  limit 1;
$$;

revoke all on function private.workspace_role(uuid) from public;
grant execute on function private.workspace_role(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.invites enable row level security;
alter table public.teams enable row level security;
alter table public.workflow_states enable row level security;
alter table public.issues enable row level security;
alter table public.labels enable row level security;
alter table public.issue_labels enable row level security;

-- Profiles
create policy "profiles_select_own_or_teammates"
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or id in (
      select wm.user_id
      from public.workspace_members wm
      where wm.workspace_id in (select private.user_workspace_ids())
    )
  );

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Workspaces
create policy "workspaces_select_member"
  on public.workspaces for select to authenticated
  using (id in (select private.user_workspace_ids()));

create policy "workspaces_insert_authenticated"
  on public.workspaces for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy "workspaces_update_admin"
  on public.workspaces for update to authenticated
  using (private.workspace_role(id) in ('owner', 'admin'))
  with check (private.workspace_role(id) in ('owner', 'admin'));

-- Members
create policy "workspace_members_select"
  on public.workspace_members for select to authenticated
  using (workspace_id in (select private.user_workspace_ids()));

create policy "workspace_members_insert_owner_bootstrap"
  on public.workspace_members for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and role = 'owner'
    and exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.created_by = (select auth.uid())
    )
  );

create policy "workspace_members_manage_admin"
  on public.workspace_members for all to authenticated
  using (private.workspace_role(workspace_id) in ('owner', 'admin'))
  with check (private.workspace_role(workspace_id) in ('owner', 'admin'));

-- Invites
create policy "invites_select_member"
  on public.invites for select to authenticated
  using (workspace_id in (select private.user_workspace_ids()));

create policy "invites_insert_admin"
  on public.invites for insert to authenticated
  with check (private.workspace_role(workspace_id) in ('owner', 'admin'));

create policy "invites_update_admin"
  on public.invites for update to authenticated
  using (private.workspace_role(workspace_id) in ('owner', 'admin'))
  with check (private.workspace_role(workspace_id) in ('owner', 'admin'));

-- Teams
create policy "teams_select_member"
  on public.teams for select to authenticated
  using (workspace_id in (select private.user_workspace_ids()));

create policy "teams_insert_member"
  on public.teams for insert to authenticated
  with check (workspace_id in (select private.user_workspace_ids()));

create policy "teams_update_member"
  on public.teams for update to authenticated
  using (workspace_id in (select private.user_workspace_ids()))
  with check (workspace_id in (select private.user_workspace_ids()));

-- Workflow states
create policy "workflow_states_select_member"
  on public.workflow_states for select to authenticated
  using (
    team_id in (
      select t.id from public.teams t
      where t.workspace_id in (select private.user_workspace_ids())
    )
  );

create policy "workflow_states_insert_via_team"
  on public.workflow_states for insert to authenticated
  with check (
    team_id in (
      select t.id from public.teams t
      where t.workspace_id in (select private.user_workspace_ids())
    )
  );

-- Issues
create policy "issues_select_member"
  on public.issues for select to authenticated
  using (workspace_id in (select private.user_workspace_ids()));

create policy "issues_insert_member"
  on public.issues for insert to authenticated
  with check (workspace_id in (select private.user_workspace_ids()));

create policy "issues_update_member"
  on public.issues for update to authenticated
  using (workspace_id in (select private.user_workspace_ids()))
  with check (workspace_id in (select private.user_workspace_ids()));

create policy "issues_delete_member"
  on public.issues for delete to authenticated
  using (workspace_id in (select private.user_workspace_ids()));

-- Labels
create policy "labels_select_member"
  on public.labels for select to authenticated
  using (workspace_id in (select private.user_workspace_ids()));

create policy "labels_write_member"
  on public.labels for all to authenticated
  using (workspace_id in (select private.user_workspace_ids()))
  with check (workspace_id in (select private.user_workspace_ids()));

create policy "issue_labels_select_member"
  on public.issue_labels for select to authenticated
  using (
    issue_id in (
      select i.id from public.issues i
      where i.workspace_id in (select private.user_workspace_ids())
    )
  );

create policy "issue_labels_write_member"
  on public.issue_labels for all to authenticated
  using (
    issue_id in (
      select i.id from public.issues i
      where i.workspace_id in (select private.user_workspace_ids())
    )
  )
  with check (
    issue_id in (
      select i.id from public.issues i
      where i.workspace_id in (select private.user_workspace_ids())
    )
  );
