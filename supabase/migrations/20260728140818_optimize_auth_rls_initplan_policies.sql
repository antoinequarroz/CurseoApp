-- Replace direct auth.uid() calls in legacy RLS policies with initplan-safe
-- `(select auth.uid())` calls. This preserves the access model while avoiding
-- per-row auth function evaluation reported by Supabase performance advisors.

drop policy if exists adresses_livraison_own on public.adresses_livraison;
create policy adresses_livraison_own
  on public.adresses_livraison
  for all
  to public
  using ((select auth.uid()) = profil_id)
  with check ((select auth.uid()) = profil_id);

drop policy if exists commandes_own on public.commandes;
create policy commandes_own
  on public.commandes
  for all
  to public
  using ((select auth.uid()) = profil_id);

drop policy if exists favoris_own on public.favoris;
create policy favoris_own
  on public.favoris
  for all
  to public
  using ((select auth.uid()) = profil_id);

drop policy if exists foyers_own on public.foyers;
create policy foyers_own
  on public.foyers
  for all
  to public
  using ((select auth.uid()) = responsable_id)
  with check ((select auth.uid()) = responsable_id);

drop policy if exists ingredient_allergenes_insert on public.ingredient_allergenes;
create policy ingredient_allergenes_insert
  on public.ingredient_allergenes
  for insert
  to public
  with check ((select auth.uid()) is not null);

drop policy if exists ingredients_insert on public.ingredients;
create policy ingredients_insert
  on public.ingredients
  for insert
  to public
  with check ((select auth.uid()) is not null);

drop policy if exists courses_own on public.listes_courses;
create policy courses_own
  on public.listes_courses
  for all
  to public
  using ((select auth.uid()) = profil_id);

drop policy if exists membres_foyer_propre_compte on public.membres_foyer;
create policy membres_foyer_propre_compte
  on public.membres_foyer
  for select
  to public
  using (profil_id = (select auth.uid()));

drop policy if exists membres_foyer_responsable on public.membres_foyer;
create policy membres_foyer_responsable
  on public.membres_foyer
  for all
  to public
  using (
    foyer_id in (
      select foyers.id
      from public.foyers
      where foyers.responsable_id = (select auth.uid())
    )
  )
  with check (
    foyer_id in (
      select foyers.id
      from public.foyers
      where foyers.responsable_id = (select auth.uid())
    )
  );

drop policy if exists notifications_own on public.notifications;
create policy notifications_own
  on public.notifications
  for all
  to public
  using ((select auth.uid()) = profil_id);

drop policy if exists planning_own on public.planning_repas;
create policy planning_own
  on public.planning_repas
  for all
  to public
  using ((select auth.uid()) = profil_id);

drop policy if exists profil_own on public.profils;
create policy profil_own
  on public.profils
  for all
  to public
  using ((select auth.uid()) = id);

drop policy if exists recette_allergenes_write on public.recette_allergenes;
create policy recette_allergenes_write
  on public.recette_allergenes
  for all
  to public
  using (
    exists (
      select 1
      from public.recettes r
      where r.id = recette_allergenes.recette_id
        and r.auteur_id = (select auth.uid())
    )
  );

drop policy if exists recette_etapes_write on public.recette_etapes;
create policy recette_etapes_write
  on public.recette_etapes
  for all
  to public
  using (
    exists (
      select 1
      from public.recettes r
      where r.id = recette_etapes.recette_id
        and r.auteur_id = (select auth.uid())
    )
  );

drop policy if exists recette_ingredients_write on public.recette_ingredients;
create policy recette_ingredients_write
  on public.recette_ingredients
  for all
  to public
  using (
    exists (
      select 1
      from public.recettes r
      where r.id = recette_ingredients.recette_id
        and r.auteur_id = (select auth.uid())
    )
  );

drop policy if exists recette_regimes_write on public.recette_regimes;
create policy recette_regimes_write
  on public.recette_regimes
  for all
  to public
  using (
    exists (
      select 1
      from public.recettes r
      where r.id = recette_regimes.recette_id
        and r.auteur_id = (select auth.uid())
    )
  );

drop policy if exists recettes_delete on public.recettes;
create policy recettes_delete
  on public.recettes
  for delete
  to public
  using (auteur_id = (select auth.uid()));

drop policy if exists recettes_insert on public.recettes;
create policy recettes_insert
  on public.recettes
  for insert
  to public
  with check (auteur_id = (select auth.uid()) and est_communautaire = true);

drop policy if exists recettes_read on public.recettes;
create policy recettes_read
  on public.recettes
  for select
  to public
  using (
    statut_publication = 'publiee'
    or auteur_id = (select auth.uid())
    or exists (
      select 1
      from public.profils p
      where p.id = (select auth.uid())
        and p.est_admin
    )
  );

drop policy if exists recettes_update on public.recettes;
create policy recettes_update
  on public.recettes
  for update
  to public
  using (
    auteur_id = (select auth.uid())
    or exists (
      select 1
      from public.profils p
      where p.id = (select auth.uid())
        and p.est_admin
    )
  )
  with check (
    auteur_id = (select auth.uid())
    or exists (
      select 1
      from public.profils p
      where p.id = (select auth.uid())
        and p.est_admin
    )
  );

drop policy if exists repas_planifies_own on public.repas_planifies;
create policy repas_planifies_own
  on public.repas_planifies
  for all
  to public
  using ((select auth.uid()) = profil_id)
  with check ((select auth.uid()) = profil_id);

drop policy if exists signalement_insert on public.signalements;
create policy signalement_insert
  on public.signalements
  for insert
  to public
  with check ((select auth.uid()) = signale_par);

drop policy if exists signalement_read_moderateur on public.signalements;
create policy signalement_read_moderateur
  on public.signalements
  for select
  to public
  using (
    exists (
      select 1
      from public.profils p
      where p.id = (select auth.uid())
        and p.est_admin
    )
  );

drop policy if exists signalement_read_own on public.signalements;
create policy signalement_read_own
  on public.signalements
  for select
  to public
  using ((select auth.uid()) = signale_par);

drop policy if exists signalement_update_moderateur on public.signalements;
create policy signalement_update_moderateur
  on public.signalements
  for update
  to public
  using (
    exists (
      select 1
      from public.profils p
      where p.id = (select auth.uid())
        and p.est_admin
    )
  )
  with check (
    exists (
      select 1
      from public.profils p
      where p.id = (select auth.uid())
        and p.est_admin
    )
  );

drop policy if exists swipes_own on public.swipes;
create policy swipes_own
  on public.swipes
  for all
  to public
  using ((select auth.uid()) = profil_id);;
