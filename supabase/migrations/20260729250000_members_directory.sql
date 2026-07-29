-- Members directory helpers + team-manager membership policies.

-- ---------------------------------------------------------------------------
-- Directory RPC: emails + last-seen for workspace members (caller must be member)
-- ---------------------------------------------------------------------------

create or replace function public.workspace_member_directory(p_workspace_id uuid)
returns table (
  user_id uuid,
  email text,
  last_seen_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_workspace_member(p_workspace_id) then
    raise exception 'not a workspace member' using errcode = '42501';
  end if;

  return query
  select
    wm.user_id,
    lower(u.email)::text as email,
    (
      select max(s.last_seen_at)
      from public.user_sessions s
      where s.user_id = wm.user_id
    ) as last_seen_at
  from public.workspace_members wm
  join auth.users u on u.id = wm.user_id
  where wm.workspace_id = p_workspace_id;
end;
$$;

revoke all on function public.workspace_member_directory(uuid) from public;
grant execute on function public.workspace_member_directory(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Team role helper
-- ---------------------------------------------------------------------------

create or replace function private.team_role(p_team_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.team_members
  where team_id = p_team_id
    and user_id = (select auth.uid())
  limit 1;
$$;

revoke all on function private.team_role(uuid) from public;
grant execute on function private.team_role(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Team membership: team owners/admins can manage (in addition to workspace admins)
-- ---------------------------------------------------------------------------

drop policy if exists "team_members_insert_member" on public.team_members;
create policy "team_members_insert_member"
  on public.team_members for insert to authenticated
  with check (
    team_id in (
      select t.id from public.teams t
      where t.workspace_id in (select private.user_workspace_ids())
    )
    and (
      user_id = (select auth.uid())
      or private.workspace_role((
        select t.workspace_id from public.teams t where t.id = team_id
      )) in ('owner', 'admin')
      or private.team_role(team_id) in ('owner', 'admin')
    )
  );

drop policy if exists "team_members_update_admin" on public.team_members;
create policy "team_members_update_admin"
  on public.team_members for update to authenticated
  using (
    private.workspace_role((
      select t.workspace_id from public.teams t where t.id = team_id
    )) in ('owner', 'admin')
    or private.team_role(team_id) in ('owner', 'admin')
  )
  with check (
    private.workspace_role((
      select t.workspace_id from public.teams t where t.id = team_id
    )) in ('owner', 'admin')
    or private.team_role(team_id) in ('owner', 'admin')
  );

drop policy if exists "team_members_delete_admin_or_self" on public.team_members;
create policy "team_members_delete_admin_or_self"
  on public.team_members for delete to authenticated
  using (
    user_id = (select auth.uid())
    or private.workspace_role((
      select t.workspace_id from public.teams t where t.id = team_id
    )) in ('owner', 'admin')
    or private.team_role(team_id) in ('owner', 'admin')
  );
