-- Email notification settings (1:1 with profiles). Website/email only.

create table public.email_notification_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,

  -- Master + delivery format
  enabled boolean not null default true,
  format text not null default 'digest'
    check (format in ('digest', 'individual')),

  -- Digest behavior
  delay_outside_work_hours boolean not null default true,
  urgent_immediate boolean not null default true,

  -- General activity emails
  assignments boolean not null default true,
  status_changes boolean not null default true,
  comments boolean not null default true,
  mentions boolean not null default true,
  reactions boolean not null default true,
  subscriptions boolean not null default true,
  document_changes boolean not null default true,
  updates boolean not null default true,
  reminders boolean not null default true,
  apps_integrations boolean not null default true,
  billing boolean not null default true,

  -- Feature emails
  customer_requests boolean not null default true,
  triage boolean not null default true,

  -- Product / account emails from Zyvia
  changelog_newsletter boolean not null default false,
  marketing boolean not null default true,
  invite_accepted boolean not null default true,
  privacy_legal boolean not null default true,

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger email_notification_settings_set_updated_at
before update on public.email_notification_settings
for each row execute function public.set_updated_at();

alter table public.email_notification_settings enable row level security;

create policy "email_notification_settings_select_own"
  on public.email_notification_settings for select to authenticated
  using (user_id = (select auth.uid()));

create policy "email_notification_settings_insert_own"
  on public.email_notification_settings for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "email_notification_settings_update_own"
  on public.email_notification_settings for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function public.handle_new_email_notification_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.email_notification_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_profile_created_email_notification_settings
after insert on public.profiles
for each row execute function public.handle_new_email_notification_settings();

insert into public.email_notification_settings (user_id)
select id from public.profiles
on conflict (user_id) do nothing;
