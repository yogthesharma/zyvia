-- Team workflows & automations settings (UI + persistence; runners deferred).

create table if not exists public.team_workflow_settings (
  team_id uuid primary key references public.teams (id) on delete cascade,
  draft_pr_status_id uuid references public.workflow_states (id) on delete set null,
  pr_open_status_id uuid references public.workflow_states (id) on delete set null,
  pr_review_status_id uuid references public.workflow_states (id) on delete set null,
  pr_ready_status_id uuid references public.workflow_states (id) on delete set null,
  pr_merge_status_id uuid references public.workflow_states (id) on delete set null,
  branch_rules jsonb not null default '[]'::jsonb,
  auto_close_parent boolean not null default false,
  auto_close_sub_issues boolean not null default false,
  auto_close_stale boolean not null default false,
  stale_after_preset text not null default '6_months'
    check (
      stale_after_preset in (
        '1_week',
        '2_weeks',
        '1_month',
        '3_months',
        '6_months',
        '1_year'
      )
    ),
  stale_status_id uuid references public.workflow_states (id) on delete set null,
  auto_archive_after_preset text not null default '6_months'
    check (
      auto_archive_after_preset in (
        'never',
        '1_week',
        '2_weeks',
        '1_month',
        '3_months',
        '6_months',
        '1_year'
      )
    ),
  status_progress_placement text not null default 'first'
    check (status_progress_placement in ('none', 'first', 'last')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint team_workflow_settings_branch_rules_is_array
    check (jsonb_typeof(branch_rules) = 'array')
);

drop trigger if exists team_workflow_settings_set_updated_at
  on public.team_workflow_settings;
create trigger team_workflow_settings_set_updated_at
before update on public.team_workflow_settings
for each row execute function public.set_updated_at();

alter table public.team_workflow_settings enable row level security;

drop policy if exists "team_workflow_settings_select_member"
  on public.team_workflow_settings;
create policy "team_workflow_settings_select_member"
  on public.team_workflow_settings for select to authenticated
  using (
    private.is_workspace_member((
      select t.workspace_id from public.teams t where t.id = team_id
    ))
  );

drop policy if exists "team_workflow_settings_insert_manager"
  on public.team_workflow_settings;
create policy "team_workflow_settings_insert_manager"
  on public.team_workflow_settings for insert to authenticated
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

drop policy if exists "team_workflow_settings_update_manager"
  on public.team_workflow_settings;
create policy "team_workflow_settings_update_manager"
  on public.team_workflow_settings for update to authenticated
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

drop policy if exists "team_workflow_settings_delete_manager"
  on public.team_workflow_settings;
create policy "team_workflow_settings_delete_manager"
  on public.team_workflow_settings for delete to authenticated
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
