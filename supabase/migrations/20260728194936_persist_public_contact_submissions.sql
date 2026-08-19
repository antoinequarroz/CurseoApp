-- Persist public contact submissions through the server API while keeping
-- direct browser/database access closed.

create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  reason text not null,
  message text not null,
  source text not null default 'contact',
  status text not null default 'new',
  consented_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_agent text,
  ip_hash text,
  constraint contact_submissions_email_not_blank_check
    check (length(btrim(email)) > 0),
  constraint contact_submissions_name_not_blank_check
    check (length(btrim(name)) > 0),
  constraint contact_submissions_reason_not_blank_check
    check (length(btrim(reason)) > 0),
  constraint contact_submissions_message_not_blank_check
    check (length(btrim(message)) > 0),
  constraint contact_submissions_status_check
    check (status in ('new', 'reviewed', 'archived'))
);

alter table public.contact_submissions enable row level security;

revoke all on table public.contact_submissions from anon, authenticated;
grant select, insert, update, delete on table public.contact_submissions to service_role;

drop policy if exists "No direct client access to contact submissions"
  on public.contact_submissions;

create policy "No direct client access to contact submissions"
  on public.contact_submissions
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

create index if not exists contact_submissions_created_at_idx
  on public.contact_submissions (created_at desc);

create index if not exists contact_submissions_status_idx
  on public.contact_submissions (status);

create index if not exists contact_submissions_email_idx
  on public.contact_submissions (lower(email));;
