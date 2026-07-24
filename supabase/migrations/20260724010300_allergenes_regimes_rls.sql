-- COUR-15 : RLS + policies, meme convention que COUR-14. Referentiels
-- (allergenes/regimes/synonymes) : lecture publique, ecriture reservee aux
-- migrations (pas de policy d'ecriture, comme unites_mesure). Tables liees a
-- un ingredient du catalogue partage : lecture publique, ajout ouvert aux
-- authentifies (pas de modification/suppression, comme `ingredients`).
-- Tables liees a une recette : ecriture reservee a l'auteur de la recette.

alter table allergenes enable row level security;
drop policy if exists allergenes_read on allergenes;
create policy allergenes_read on allergenes for select using (true);

alter table regimes enable row level security;
drop policy if exists regimes_read on regimes;
create policy regimes_read on regimes for select using (true);

alter table synonymes_allergenes enable row level security;
drop policy if exists synonymes_allergenes_read on synonymes_allergenes;
create policy synonymes_allergenes_read on synonymes_allergenes for select using (true);

alter table ingredient_allergenes enable row level security;
drop policy if exists ingredient_allergenes_read on ingredient_allergenes;
create policy ingredient_allergenes_read on ingredient_allergenes for select using (true);
drop policy if exists ingredient_allergenes_insert on ingredient_allergenes;
create policy ingredient_allergenes_insert on ingredient_allergenes for insert with check (auth.uid() is not null);

alter table recette_allergenes enable row level security;
drop policy if exists recette_allergenes_read on recette_allergenes;
create policy recette_allergenes_read on recette_allergenes for select using (true);
drop policy if exists recette_allergenes_write on recette_allergenes;
create policy recette_allergenes_write on recette_allergenes for all using (
  exists (select 1 from recettes r where r.id = recette_allergenes.recette_id and r.auteur_id = auth.uid())
);

alter table recette_regimes enable row level security;
drop policy if exists recette_regimes_read on recette_regimes;
create policy recette_regimes_read on recette_regimes for select using (true);
drop policy if exists recette_regimes_write on recette_regimes;
create policy recette_regimes_write on recette_regimes for all using (
  exists (select 1 from recettes r where r.id = recette_regimes.recette_id and r.auteur_id = auth.uid())
);
