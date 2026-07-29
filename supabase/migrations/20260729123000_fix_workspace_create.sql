-- Fix workspace creation: insert().select() failed because SELECT RLS
-- only allowed members, and membership is added after the insert.

drop policy if exists "workspaces_select_member" on public.workspaces;

create policy "workspaces_select_member_or_creator"
  on public.workspaces for select to authenticated
  using (
    id in (select private.user_workspace_ids())
    or created_by = (select auth.uid())
  );

-- Atomic workspace + owner membership bootstrap
create or replace function public.create_workspace(p_name text, p_slug text)
returns public.workspaces
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  ws public.workspaces;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Workspace name is required';
  end if;

  if p_slug is null or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Invalid workspace slug';
  end if;

  insert into public.workspaces (name, slug, created_by)
  values (trim(p_name), p_slug, uid)
  returning * into ws;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws.id, uid, 'owner');

  return ws;
end;
$$;

revoke all on function public.create_workspace(text, text) from public;
grant execute on function public.create_workspace(text, text) to authenticated;

-- Ensure API roles can use tables (safe if already granted)
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
