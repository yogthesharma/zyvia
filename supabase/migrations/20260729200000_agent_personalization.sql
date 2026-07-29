-- Personal agent guidance (1:1 with profiles).

create table public.user_agent_personalization (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  guidance text not null default '',
  guidance_updated_at timestamptz,
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

-- Ensure every profile has a row
create or replace function public.handle_new_user_agent_personalization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_agent_personalization (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_profile_created_agent_personalization on public.profiles;

create trigger on_profile_created_agent_personalization
after insert on public.profiles
for each row execute function public.handle_new_user_agent_personalization();

-- Backfill existing profiles
insert into public.user_agent_personalization (user_id)
select id from public.profiles
on conflict (user_id) do nothing;
