-- Add support workflow metadata for public contact leads.

alter table public.contact_submissions
  add column if not exists internal_note text;

alter table public.contact_submissions
  drop constraint if exists contact_submissions_internal_note_length_check,
  add constraint contact_submissions_internal_note_length_check
    check (internal_note is null or length(internal_note) <= 2000);;
