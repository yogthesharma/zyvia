-- Team General settings: description + deferred feature flags.

alter table public.teams
  add column if not exists description text not null default '',
  add column if not exists email_intake_enabled boolean not null default false,
  add column if not exists detailed_issue_history boolean not null default false;

alter table public.teams
  drop constraint if exists teams_description_length;

alter table public.teams
  add constraint teams_description_length
  check (char_length(description) <= 500);

comment on column public.teams.description is
  'Short summary shown on the team page.';

comment on column public.teams.email_intake_enabled is
  'When true, team accepts issue creation by email (intake delivery not shipped yet).';

comment on column public.teams.detailed_issue_history is
  'When true, persist distinct history entries per issue change (history writer not shipped yet).';
