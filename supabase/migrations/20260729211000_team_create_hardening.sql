-- Create-team rollback deletes the team if membership insert fails.
-- Without DELETE RLS, that cleanup silently no-ops and leaves orphan teams.

drop policy if exists "teams_delete_member" on public.teams;
create policy "teams_delete_member"
  on public.teams for delete to authenticated
  using (workspace_id in (select private.user_workspace_ids()));

-- Keep icons non-null going forward (backfill already ran in 20260729210000).
update public.teams
set icon = 'users'
where icon is null or btrim(icon) = '';

alter table public.teams
  alter column icon set default 'users';

alter table public.teams
  alter column icon set not null;
