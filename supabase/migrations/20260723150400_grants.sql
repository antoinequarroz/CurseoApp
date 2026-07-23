-- COUR-9 : grants existants en production, jamais versionnes. RLS reste la
-- seule barriere reelle (voir 20260723150300_rls_policies.sql) — ce sont les
-- privileges par defaut Supabase, deja en place sur toutes les tables.

grant all on table
  profils, recettes, planning_repas, listes_courses, commandes, notifications,
  favoris, swipes, signalements, rate_limits, waitlist, profils_actifs, recettes_a_moderer
to anon, authenticated;
