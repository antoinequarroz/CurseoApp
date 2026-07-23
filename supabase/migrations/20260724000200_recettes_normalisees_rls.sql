-- COUR-14 : RLS + policies sur les nouvelles tables. `recettes` a deja RLS +
-- policies depuis COUR-9 (recettes_read public, recettes_write = auteur) —
-- inchange ici. Les tables filles suivent la meme regle de propriete que
-- leur recette parente : lecture publique, ecriture reservee a l'auteur de
-- la recette (verifie via une sous-requete sur recettes.auteur_id).

alter table unites_mesure enable row level security;
drop policy if exists unites_mesure_read on unites_mesure;
create policy unites_mesure_read on unites_mesure for select using (true);
-- Pas de policy d'ecriture : table de reference geree par migration
-- uniquement (comme rate_limits/waitlist, voir SCHEMA_INVENTORY.md §4).

alter table ingredients enable row level security;
drop policy if exists ingredients_read on ingredients;
create policy ingredients_read on ingredients for select using (true);
drop policy if exists ingredients_insert on ingredients;
create policy ingredients_insert on ingredients for insert with check (auth.uid() is not null);
-- Catalogue partage entre utilisateurs (pas de colonne "proprietaire") :
-- tout utilisateur authentifie peut ajouter un ingredient manquant au
-- catalogue, mais pas le modifier/supprimer (eviterait qu'un utilisateur
-- casse une recette d'un autre en renommant un ingredient partage).

alter table recette_ingredients enable row level security;
drop policy if exists recette_ingredients_read on recette_ingredients;
create policy recette_ingredients_read on recette_ingredients for select using (true);
drop policy if exists recette_ingredients_write on recette_ingredients;
create policy recette_ingredients_write on recette_ingredients for all using (
  exists (select 1 from recettes r where r.id = recette_ingredients.recette_id and r.auteur_id = auth.uid())
);

alter table recette_etapes enable row level security;
drop policy if exists recette_etapes_read on recette_etapes;
create policy recette_etapes_read on recette_etapes for select using (true);
drop policy if exists recette_etapes_write on recette_etapes;
create policy recette_etapes_write on recette_etapes for all using (
  exists (select 1 from recettes r where r.id = recette_etapes.recette_id and r.auteur_id = auth.uid())
);
