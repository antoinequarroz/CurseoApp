-- Consolidate overlapping permissive SELECT policies reported by Supabase.
-- This keeps equivalent access predicates but avoids having a write policy
-- declared as FOR ALL when a separate read policy already exists.

drop policy if exists membres_foyer_propre_compte on public.membres_foyer;
drop policy if exists membres_foyer_responsable on public.membres_foyer;

create policy membres_foyer_select
  on public.membres_foyer
  for select
  to public
  using (
    profil_id = (select auth.uid())
    or foyer_id in (
      select foyers.id
      from public.foyers
      where foyers.responsable_id = (select auth.uid())
    )
  );

create policy membres_foyer_insert
  on public.membres_foyer
  for insert
  to public
  with check (
    foyer_id in (
      select foyers.id
      from public.foyers
      where foyers.responsable_id = (select auth.uid())
    )
  );

create policy membres_foyer_update
  on public.membres_foyer
  for update
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

create policy membres_foyer_delete
  on public.membres_foyer
  for delete
  to public
  using (
    foyer_id in (
      select foyers.id
      from public.foyers
      where foyers.responsable_id = (select auth.uid())
    )
  );

drop policy if exists recette_allergenes_write on public.recette_allergenes;
create policy recette_allergenes_insert
  on public.recette_allergenes
  for insert
  to public
  with check (
    exists (
      select 1
      from public.recettes r
      where r.id = recette_allergenes.recette_id
        and r.auteur_id = (select auth.uid())
    )
  );
create policy recette_allergenes_update
  on public.recette_allergenes
  for update
  to public
  using (
    exists (
      select 1
      from public.recettes r
      where r.id = recette_allergenes.recette_id
        and r.auteur_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.recettes r
      where r.id = recette_allergenes.recette_id
        and r.auteur_id = (select auth.uid())
    )
  );
create policy recette_allergenes_delete
  on public.recette_allergenes
  for delete
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
create policy recette_etapes_insert
  on public.recette_etapes
  for insert
  to public
  with check (
    exists (
      select 1
      from public.recettes r
      where r.id = recette_etapes.recette_id
        and r.auteur_id = (select auth.uid())
    )
  );
create policy recette_etapes_update
  on public.recette_etapes
  for update
  to public
  using (
    exists (
      select 1
      from public.recettes r
      where r.id = recette_etapes.recette_id
        and r.auteur_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.recettes r
      where r.id = recette_etapes.recette_id
        and r.auteur_id = (select auth.uid())
    )
  );
create policy recette_etapes_delete
  on public.recette_etapes
  for delete
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
create policy recette_ingredients_insert
  on public.recette_ingredients
  for insert
  to public
  with check (
    exists (
      select 1
      from public.recettes r
      where r.id = recette_ingredients.recette_id
        and r.auteur_id = (select auth.uid())
    )
  );
create policy recette_ingredients_update
  on public.recette_ingredients
  for update
  to public
  using (
    exists (
      select 1
      from public.recettes r
      where r.id = recette_ingredients.recette_id
        and r.auteur_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.recettes r
      where r.id = recette_ingredients.recette_id
        and r.auteur_id = (select auth.uid())
    )
  );
create policy recette_ingredients_delete
  on public.recette_ingredients
  for delete
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
create policy recette_regimes_insert
  on public.recette_regimes
  for insert
  to public
  with check (
    exists (
      select 1
      from public.recettes r
      where r.id = recette_regimes.recette_id
        and r.auteur_id = (select auth.uid())
    )
  );
create policy recette_regimes_update
  on public.recette_regimes
  for update
  to public
  using (
    exists (
      select 1
      from public.recettes r
      where r.id = recette_regimes.recette_id
        and r.auteur_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.recettes r
      where r.id = recette_regimes.recette_id
        and r.auteur_id = (select auth.uid())
    )
  );
create policy recette_regimes_delete
  on public.recette_regimes
  for delete
  to public
  using (
    exists (
      select 1
      from public.recettes r
      where r.id = recette_regimes.recette_id
        and r.auteur_id = (select auth.uid())
    )
  );

drop policy if exists signalement_read_moderateur on public.signalements;
drop policy if exists signalement_read_own on public.signalements;

create policy signalement_select
  on public.signalements
  for select
  to public
  using (
    (select auth.uid()) = signale_par
    or exists (
      select 1
      from public.profils p
      where p.id = (select auth.uid())
        and p.est_admin
    )
  );;
