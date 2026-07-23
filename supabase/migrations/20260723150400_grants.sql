-- COUR-9 : grants existants en production, jamais versionnes. RLS reste la
-- seule barriere reelle pour anon/authenticated (voir
-- 20260723150300_rls_policies.sql) — ce sont les privileges par defaut
-- Supabase, deja en place sur toutes les tables.
--
-- COUR-10 (correction) : service_role manquait ici. Sur le projet distant
-- (deja provisionne), service_role a ces grants + rolbypassrls=true, donc
-- l'absence de cette ligne passait inapercue. Sur un environnement local
-- fraichement reconstruit (`supabase start`/`db reset`), service_role n'a
-- PAS ces grants par defaut : les Edge Functions (qui utilisent la cle
-- service_role) auraient echoue avec "permission denied" sur un environnement
-- neuf — trouve en executant `supabase start` pour de vrai.

grant all on table
  profils, recettes, planning_repas, listes_courses, commandes, notifications,
  favoris, swipes, signalements, rate_limits, waitlist, profils_actifs, recettes_a_moderer
to anon, authenticated, service_role;
