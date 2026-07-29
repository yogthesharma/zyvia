-- Workspace document templates (Features → Documents).
-- team_id NULL = workspace-wide; set for team-scoped templates later.

create table public.document_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  team_id uuid references public.teams (id) on delete cascade,
  name text not null,
  icon text not null default 'file-text',
  -- Plate rich document JSON (same shape as issues.description_doc)
  body_doc jsonb,
  -- Derived plain text for search / snippets
  body_text text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint document_templates_name_length
    check (char_length(trim(name)) between 1 and 120),
  constraint document_templates_icon_length
    check (char_length(icon) between 1 and 64),
  constraint document_templates_body_text_length
    check (char_length(body_text) <= 100000)
);

create index document_templates_workspace_updated_idx
  on public.document_templates (workspace_id, updated_at desc)
  where team_id is null;

create index document_templates_team_updated_idx
  on public.document_templates (team_id, updated_at desc)
  where team_id is not null;

create index document_templates_workspace_id_idx
  on public.document_templates (workspace_id);

create trigger document_templates_set_updated_at
before update on public.document_templates
for each row execute function public.set_updated_at();

-- Keep team templates inside the same workspace as the team.
create or replace function private.document_templates_team_workspace_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  team_workspace uuid;
begin
  if new.team_id is null then
    return new;
  end if;

  select t.workspace_id into team_workspace
  from public.teams t
  where t.id = new.team_id;

  if team_workspace is null then
    raise exception 'Team not found for document template';
  end if;

  if team_workspace <> new.workspace_id then
    raise exception 'Document template team must belong to the same workspace';
  end if;

  return new;
end;
$$;

revoke all on function private.document_templates_team_workspace_guard() from public;

create trigger document_templates_team_workspace_guard
before insert or update of team_id, workspace_id on public.document_templates
for each row execute function private.document_templates_team_workspace_guard();

alter table public.document_templates enable row level security;

create policy "document_templates_select_member"
  on public.document_templates for select to authenticated
  using (private.is_workspace_member(workspace_id));

create policy "document_templates_insert_admin"
  on public.document_templates for insert to authenticated
  with check (private.workspace_role(workspace_id) in ('owner', 'admin'));

create policy "document_templates_update_admin"
  on public.document_templates for update to authenticated
  using (private.workspace_role(workspace_id) in ('owner', 'admin'))
  with check (private.workspace_role(workspace_id) in ('owner', 'admin'));

create policy "document_templates_delete_admin"
  on public.document_templates for delete to authenticated
  using (private.workspace_role(workspace_id) in ('owner', 'admin'));

grant select, insert, update, delete on public.document_templates to authenticated;
