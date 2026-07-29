-- Harden create_workspace slug length to match table constraints.

create or replace function public.create_workspace(
  p_name text,
  p_slug text,
  p_region text default null
)
returns public.workspaces
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  ws public.workspaces;
  region_label text := nullif(trim(coalesce(p_region, '')), '');
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Workspace name is required';
  end if;

  if length(trim(p_name)) > 80 then
    raise exception 'Workspace name is too long';
  end if;

  if p_slug is null
     or char_length(p_slug) < 2
     or char_length(p_slug) > 48
     or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Invalid workspace slug';
  end if;

  if region_label is null then
    region_label := 'Asia Pacific';
  end if;

  insert into public.workspaces (name, slug, created_by, region)
  values (trim(p_name), p_slug, uid, region_label)
  returning * into ws;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws.id, uid, 'owner');

  return ws;
end;
$$;
