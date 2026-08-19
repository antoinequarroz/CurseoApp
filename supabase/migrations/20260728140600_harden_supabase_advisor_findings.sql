-- Harden advisor findings reported by Supabase.
--
-- Scope:
-- - explicit deny policies for server-owned public tables
-- - remove broad public listing policy from the legacy images bucket
-- - pin search_path for legacy public functions

revoke all on table public.rate_limits from anon, authenticated;
revoke all on table public.waitlist from anon, authenticated;
revoke all on table public.webhook_evenements_abonnement from anon, authenticated;

drop policy if exists "No direct client access to rate limits" on public.rate_limits;
create policy "No direct client access to rate limits"
  on public.rate_limits
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "No direct client access to waitlist" on public.waitlist;
create policy "No direct client access to waitlist"
  on public.waitlist
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "No direct client access to subscription webhooks" on public.webhook_evenements_abonnement;
create policy "No direct client access to subscription webhooks"
  on public.webhook_evenements_abonnement
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists images_read on storage.objects;

alter function public.fn_importer_recettes_csv(lignes jsonb, dry_run boolean)
  set search_path = public, extensions;

alter function public.fn_normaliser_terme(terme text)
  set search_path = public, extensions;

alter function public.fn_proteger_abonnement_profil()
  set search_path = public, extensions;

alter function public.fn_resoudre_allergene(terme text)
  set search_path = public, extensions;

alter function public.fn_verifier_ajout_membre_foyer()
  set search_path = public, extensions;

alter function public.fn_verifier_recette_soumissible()
  set search_path = public, extensions;;
