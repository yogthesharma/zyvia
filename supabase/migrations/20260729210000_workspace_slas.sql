-- Workspace SLA settings + automation rules (settings only; issue evaluation later).

create table public.workspace_sla_settings (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  enabled boolean not null default false,
  work_week text not null default 'mon_fri'
    check (work_week in ('mon_fri', 'sun_thu')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger workspace_sla_settings_set_updated_at
before update on public.workspace_sla_settings
for each row execute function public.set_updated_at();

create table public.workspace_sla_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  position integer not null,
  action text not null check (action in ('add', 'remove')),
  duration_preset text
    check (
      duration_preset is null
      or duration_preset in ('12h', '24h', '48h', '1w', '2w', '4w', 'custom')
    ),
  custom_amount integer
    check (custom_amount is null or custom_amount > 0),
  custom_unit text
    check (
      custom_unit is null
      or custom_unit in ('hour', 'day', 'business_day', 'week')
    ),
  -- v1 filter shape: { "priority": ["urgent"|"high"|"medium"|"low"|"none", ...] }
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint workspace_sla_rules_add_has_duration check (
    (action = 'remove' and duration_preset is null and custom_amount is null and custom_unit is null)
    or (
      action = 'add'
      and duration_preset is not null
      and (
        (duration_preset <> 'custom' and custom_amount is null and custom_unit is null)
        or (duration_preset = 'custom' and custom_amount is not null and custom_unit is not null)
      )
    )
  ),
  constraint workspace_sla_rules_position_positive check (position >= 0)
);

create unique index workspace_sla_rules_workspace_position_uidx
  on public.workspace_sla_rules (workspace_id, position);

create index workspace_sla_rules_workspace_id_idx
  on public.workspace_sla_rules (workspace_id);

create trigger workspace_sla_rules_set_updated_at
before update on public.workspace_sla_rules
for each row execute function public.set_updated_at();

alter table public.workspace_sla_settings enable row level security;
alter table public.workspace_sla_rules enable row level security;

create policy "workspace_sla_settings_select_member"
  on public.workspace_sla_settings for select to authenticated
  using (private.is_workspace_member(workspace_id));

create policy "workspace_sla_settings_insert_admin"
  on public.workspace_sla_settings for insert to authenticated
  with check (private.workspace_role(workspace_id) in ('owner', 'admin'));

create policy "workspace_sla_settings_update_admin"
  on public.workspace_sla_settings for update to authenticated
  using (private.workspace_role(workspace_id) in ('owner', 'admin'))
  with check (private.workspace_role(workspace_id) in ('owner', 'admin'));

create policy "workspace_sla_rules_select_member"
  on public.workspace_sla_rules for select to authenticated
  using (private.is_workspace_member(workspace_id));

create policy "workspace_sla_rules_insert_admin"
  on public.workspace_sla_rules for insert to authenticated
  with check (private.workspace_role(workspace_id) in ('owner', 'admin'));

create policy "workspace_sla_rules_update_admin"
  on public.workspace_sla_rules for update to authenticated
  using (private.workspace_role(workspace_id) in ('owner', 'admin'))
  with check (private.workspace_role(workspace_id) in ('owner', 'admin'));

create policy "workspace_sla_rules_delete_admin"
  on public.workspace_sla_rules for delete to authenticated
  using (private.workspace_role(workspace_id) in ('owner', 'admin'));

grant select, insert, update on public.workspace_sla_settings to authenticated;
grant select, insert, update, delete on public.workspace_sla_rules to authenticated;
