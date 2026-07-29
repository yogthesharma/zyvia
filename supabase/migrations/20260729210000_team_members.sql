-- Team membership: creators (and later invites) belong to teams.

create table public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (team_id, user_id)
);

create index team_members_user_id_idx on public.team_members (user_id);

alter table public.team_members enable row level security;

create policy "team_members_select_workspace"
  on public.team_members for select to authenticated
  using (
    team_id in (
      select t.id from public.teams t
      where t.workspace_id in (select private.user_workspace_ids())
    )
  );

-- Creator (or any workspace member adding themselves) / workspace admins can add.
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
    )
  );

create policy "team_members_update_admin"
  on public.team_members for update to authenticated
  using (
    private.workspace_role((
      select t.workspace_id from public.teams t where t.id = team_id
    )) in ('owner', 'admin')
  )
  with check (
    private.workspace_role((
      select t.workspace_id from public.teams t where t.id = team_id
    )) in ('owner', 'admin')
  );

create policy "team_members_delete_admin_or_self"
  on public.team_members for delete to authenticated
  using (
    user_id = (select auth.uid())
    or private.workspace_role((
      select t.workspace_id from public.teams t where t.id = team_id
    )) in ('owner', 'admin')
  );

-- Default icon for teams that never chose one.
update public.teams
set icon = 'users'
where icon is null or btrim(icon) = '';

-- Backfill: workspace owners become team owners for teams with no members yet.
insert into public.team_members (team_id, user_id, role)
select t.id, wm.user_id, 'owner'
from public.teams t
join public.workspace_members wm
  on wm.workspace_id = t.workspace_id
 and wm.role = 'owner'
where not exists (
  select 1 from public.team_members tm where tm.team_id = t.id
)
on conflict do nothing;
