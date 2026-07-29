-- Personal agent skills (reusable prompts per user).

create table public.user_agent_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  instructions text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_agent_skills_name_length
    check (char_length(trim(name)) between 1 and 120),
  constraint user_agent_skills_instructions_length
    check (char_length(instructions) <= 20000)
);

create index user_agent_skills_user_id_idx
  on public.user_agent_skills (user_id, created_at desc);

create trigger user_agent_skills_set_updated_at
before update on public.user_agent_skills
for each row execute function public.set_updated_at();

alter table public.user_agent_skills enable row level security;

create policy "user_agent_skills_select_own"
  on public.user_agent_skills for select to authenticated
  using (user_id = (select auth.uid()));

create policy "user_agent_skills_insert_own"
  on public.user_agent_skills for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "user_agent_skills_update_own"
  on public.user_agent_skills for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "user_agent_skills_delete_own"
  on public.user_agent_skills for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.user_agent_skills to authenticated;
