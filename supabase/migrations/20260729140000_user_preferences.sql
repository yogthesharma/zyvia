-- Personal preferences (1:1 with profiles).
-- Theme mode remains on profiles.theme; light/dark system pairings live here.

create table public.user_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,

  -- General
  default_home_view text not null default 'issues'
    check (
      default_home_view in (
        'issues',
        'inbox',
        'projects',
        'cycles',
        'views',
        'initiatives'
      )
    ),
  display_name_format text not null default 'username'
    check (
      display_name_format in (
        'username',
        'full_name',
        'full_name_and_username'
      )
    ),
  first_day_of_week smallint not null default 0
    check (first_day_of_week between 0 and 6),
  convert_emoticons boolean not null default true,
  comment_submit_shortcut text not null default 'mod_enter'
    check (comment_submit_shortcut in ('mod_enter', 'enter')),

  -- Interface
  font_size text not null default 'default'
    check (font_size in ('small', 'default', 'large')),
  use_pointer_cursors boolean not null default false,
  underline_links boolean not null default false,
  theme_light text not null default 'light'
    check (theme_light in ('light', 'dark')),
  theme_dark text not null default 'dark'
    check (theme_dark in ('light', 'dark')),

  -- Automations
  auto_assign_to_self boolean not null default false,
  auto_assign_on_started boolean not null default false,

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

alter table public.user_preferences enable row level security;

create policy "user_preferences_select_own"
  on public.user_preferences for select to authenticated
  using (user_id = (select auth.uid()));

create policy "user_preferences_insert_own"
  on public.user_preferences for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "user_preferences_update_own"
  on public.user_preferences for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Ensure every profile has a preferences row
create or replace function public.handle_new_user_preferences()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_profile_created_preferences
after insert on public.profiles
for each row execute function public.handle_new_user_preferences();

insert into public.user_preferences (user_id)
select id from public.profiles
on conflict (user_id) do nothing;
