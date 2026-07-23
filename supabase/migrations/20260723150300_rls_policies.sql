-- COUR-9 : RLS + policies existantes en production, jamais versionnees
-- (a l'exception de l'activation RLS sur waitlist/rate_limits, deja dans
-- 20260715080000). DROP POLICY IF EXISTS + CREATE : idempotent, rejouable
-- sans erreur sur une base qui a deja ces policies.

alter table profils enable row level security;
alter table recettes enable row level security;
alter table planning_repas enable row level security;
alter table listes_courses enable row level security;
alter table commandes enable row level security;
alter table notifications enable row level security;
alter table favoris enable row level security;
alter table swipes enable row level security;
alter table signalements enable row level security;
alter table rate_limits enable row level security;
alter table waitlist enable row level security;

drop policy if exists profil_own on profils;
create policy profil_own on profils for all using (auth.uid() = id);

drop policy if exists recettes_read on recettes;
create policy recettes_read on recettes for select using (true);

drop policy if exists recettes_write on recettes;
create policy recettes_write on recettes for all using (auth.uid() = auteur_id);

drop policy if exists planning_own on planning_repas;
create policy planning_own on planning_repas for all using (auth.uid() = profil_id);

drop policy if exists courses_own on listes_courses;
create policy courses_own on listes_courses for all using (auth.uid() = profil_id);

drop policy if exists commandes_own on commandes;
create policy commandes_own on commandes for all using (auth.uid() = profil_id);

drop policy if exists notifications_own on notifications;
create policy notifications_own on notifications for all using (auth.uid() = profil_id);

drop policy if exists favoris_own on favoris;
create policy favoris_own on favoris for all using (auth.uid() = profil_id);

drop policy if exists swipes_own on swipes;
create policy swipes_own on swipes for all using (auth.uid() = profil_id);

drop policy if exists signalement_insert on signalements;
create policy signalement_insert on signalements for insert with check (auth.uid() = signale_par);

drop policy if exists signalement_read_own on signalements;
create policy signalement_read_own on signalements for select using (auth.uid() = signale_par);

-- rate_limits et waitlist : RLS active, volontairement AUCUNE policy — voir
-- supabase/SCHEMA_INVENTORY.md §4. Acces uniquement via les Edge Functions
-- (cle service_role, qui contourne RLS). Ne pas ajouter de policy ici sans
-- comprendre pourquoi elles ont ete omises a l'origine.
