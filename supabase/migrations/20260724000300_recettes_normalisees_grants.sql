-- COUR-14 : grants sur les nouvelles tables, meme pattern que
-- 20260723150400_grants.sql — RLS reste la seule barriere reelle pour
-- anon/authenticated, service_role indispensable des la creation (voir
-- la lecon COUR-10 dans ce meme fichier historique).

grant all on table unites_mesure, ingredients, recette_ingredients, recette_etapes
to anon, authenticated, service_role;

-- `recettes_a_moderer` a ete recreee (drop + create, pas create or replace)
-- par 20260724000000 pour retirer les colonnes ingredients/etapes : nouvel
-- OID, donc les grants de 20260723150400_grants.sql ne s'appliquent plus.
grant all on table recettes_a_moderer to anon, authenticated, service_role;
