-- Audit fixes: issue integrity + helpful indexes

-- Ensure issue.team belongs to the same workspace
create or replace function public.enforce_issue_team_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  team_workspace uuid;
  status_team uuid;
begin
  select workspace_id into team_workspace
  from public.teams
  where id = new.team_id;

  if team_workspace is null then
    raise exception 'Invalid team for issue';
  end if;

  if team_workspace <> new.workspace_id then
    raise exception 'Team does not belong to workspace';
  end if;

  select team_id into status_team
  from public.workflow_states
  where id = new.status_id;

  if status_team is null then
    raise exception 'Invalid status for issue';
  end if;

  if status_team <> new.team_id then
    raise exception 'Status does not belong to team';
  end if;

  return new;
end;
$$;

drop trigger if exists issues_enforce_team_workspace on public.issues;

create trigger issues_enforce_team_workspace
before insert or update of workspace_id, team_id, status_id
on public.issues
for each row execute function public.enforce_issue_team_workspace();

-- Deterministic "primary" membership lookup
create index if not exists workspace_members_user_created_idx
  on public.workspace_members (user_id, created_at);
