-- Team-scoped agent skills (reusable instructions shared with a team).

create table public.team_agent_skills (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  name text not null,
  instructions text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint team_agent_skills_name_length
    check (char_length(trim(name)) between 1 and 120),
  constraint team_agent_skills_instructions_length
    check (char_length(instructions) <= 20000)
);

create index team_agent_skills_team_updated_idx
  on public.team_agent_skills (team_id, updated_at desc);

create index team_agent_skills_workspace_idx
  on public.team_agent_skills (workspace_id);

create trigger team_agent_skills_set_updated_at
before update on public.team_agent_skills
for each row execute function public.set_updated_at();

create or replace function private.team_agent_skills_team_workspace_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  team_workspace uuid;
begin
  select t.workspace_id into team_workspace
  from public.teams t
  where t.id = new.team_id;

  if team_workspace is null then
    raise exception 'Team not found for agent skill';
  end if;

  if team_workspace <> new.workspace_id then
    raise exception 'Agent skill team must belong to the same workspace';
  end if;

  return new;
end;
$$;

revoke all on function private.team_agent_skills_team_workspace_guard() from public;

create trigger team_agent_skills_team_workspace_guard
before insert or update of team_id, workspace_id on public.team_agent_skills
for each row execute function private.team_agent_skills_team_workspace_guard();

alter table public.team_agent_skills enable row level security;

-- Any workspace member can read team skills in their workspace.
create policy "team_agent_skills_select_member"
  on public.team_agent_skills for select to authenticated
  using (private.is_workspace_member(workspace_id));

-- Team members or workspace owners/admins can create.
create policy "team_agent_skills_insert_member"
  on public.team_agent_skills for insert to authenticated
  with check (
    private.is_workspace_member(workspace_id)
    and (
      private.workspace_role(workspace_id) in ('owner', 'admin')
      or private.team_role(team_id) is not null
    )
  );

create policy "team_agent_skills_update_member"
  on public.team_agent_skills for update to authenticated
  using (
    private.is_workspace_member(workspace_id)
    and (
      private.workspace_role(workspace_id) in ('owner', 'admin')
      or private.team_role(team_id) is not null
    )
  )
  with check (
    private.is_workspace_member(workspace_id)
    and (
      private.workspace_role(workspace_id) in ('owner', 'admin')
      or private.team_role(team_id) is not null
    )
  );

create policy "team_agent_skills_delete_member"
  on public.team_agent_skills for delete to authenticated
  using (
    private.is_workspace_member(workspace_id)
    and (
      private.workspace_role(workspace_id) in ('owner', 'admin')
      or private.team_role(team_id) is not null
    )
  );

grant select, insert, update, delete on public.team_agent_skills to authenticated;
