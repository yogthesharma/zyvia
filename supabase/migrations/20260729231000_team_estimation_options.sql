-- Team estimation sub-options (shown when issue estimation is enabled).

alter table public.teams
  add column if not exists allow_zero_estimates boolean not null default false,
  add column if not exists extended_estimate_scale boolean not null default false,
  add column if not exists count_unestimated_issues boolean not null default true;

comment on column public.teams.allow_zero_estimates is
  'When estimation is enabled, allow estimating issues as zero.';

comment on column public.teams.extended_estimate_scale is
  'When estimation is enabled, expose an extended estimate scale.';

comment on column public.teams.count_unestimated_issues is
  'When estimation is enabled, count unestimated issues toward capacity.';
