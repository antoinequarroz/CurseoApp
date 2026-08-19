-- Persist public waitlist submissions through the server API while keeping
-- direct client access closed by RLS/grants.

alter table public.waitlist
  add column if not exists household_size integer,
  add column if not exists interests text[] not null default '{}',
  add column if not exists consented_at timestamp with time zone,
  add column if not exists updated_at timestamp with time zone not null default now(),
  add column if not exists user_agent text,
  add column if not exists ip_hash text;

alter table public.waitlist
  drop constraint if exists waitlist_household_size_check,
  add constraint waitlist_household_size_check
    check (household_size is null or household_size between 1 and 12);

alter table public.waitlist
  drop constraint if exists waitlist_email_not_blank_check,
  add constraint waitlist_email_not_blank_check
    check (length(trim(email)) > 3);

create table if not exists public.public_submission_rate_limits (
  subject_hash text not null,
  endpoint text not null,
  requests integer not null default 1,
  window_start timestamp with time zone not null default now(),
  primary key (subject_hash, endpoint)
);

alter table public.public_submission_rate_limits enable row level security;

revoke all on table public.public_submission_rate_limits from anon, authenticated;
grant select, insert, update, delete on table public.public_submission_rate_limits to service_role;
grant select, insert, update on table public.waitlist to service_role;

drop policy if exists "No direct client access to public submission rate limits"
  on public.public_submission_rate_limits;

create policy "No direct client access to public submission rate limits"
  on public.public_submission_rate_limits
  for all
  to anon, authenticated
  using (false)
  with check (false);;
