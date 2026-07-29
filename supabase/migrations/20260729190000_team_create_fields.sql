-- Team create flow: icon, timezone, and workflow copy support

alter table public.teams
  add column if not exists icon text,
  add column if not exists timezone text not null default 'UTC';

alter table public.teams
  drop constraint if exists teams_timezone_nonempty;

alter table public.teams
  add constraint teams_timezone_nonempty
  check (char_length(trim(timezone)) > 0);

alter table public.teams
  drop constraint if exists teams_icon_length;

alter table public.teams
  add constraint teams_icon_length
  check (icon is null or char_length(icon) between 1 and 64);

-- Allow replacing seeded workflow states when copying from another team.
drop policy if exists "workflow_states_delete_member" on public.workflow_states;
create policy "workflow_states_delete_member"
  on public.workflow_states for delete to authenticated
  using (
    team_id in (
      select t.id from public.teams t
      where t.workspace_id in (select private.user_workspace_ids())
    )
  );
