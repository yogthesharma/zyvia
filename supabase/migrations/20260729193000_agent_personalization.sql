-- Personal agent guidance (1:1 with profiles).

create table public.user_agent_personalization (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  guidance text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_agent_personalization_guidance_length
    check (char_length(guidance) <= 10000)
);

create trigger user_agent_personalization_set_updated_at
before update on public.user_agent_personalization
for each row execute function public.set_updated_at();

alter table public.user_agent_personalization enable row level security;

create policy "user_agent_personalization_select_own"
  on public.user_agent_personalization for select to authenticated
  using (user_id = (select auth.uid()));

create policy "user_agent_personalization_insert_own"
  on public.user_agent_personalization for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "user_agent_personalization_update_own"
  on public.user_agent_personalization for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update on public.user_agent_personalization to authenticated;
