-- COUR-15 : grants sur les nouvelles tables/vue/fonctions, meme pattern que
-- COUR-14 — RLS reste la seule barriere reelle pour anon/authenticated.

grant all on table
  allergenes, regimes, synonymes_allergenes, ingredient_allergenes,
  recette_allergenes, recette_regimes
to anon, authenticated, service_role;

-- `recettes_a_moderer` recreee (drop + create) par 20260724010000 : nouvel
-- OID, les grants precedents ne s'appliquent plus.
grant all on table recettes_a_moderer to anon, authenticated, service_role;

-- Vue de deduction, lecture seule (pas de donnees a ecrire, c'est un calcul).
grant select on table recette_allergenes_effectifs to anon, authenticated, service_role;

-- Les fonctions ne sont pas couvertes par "grant all on table" : sans ces
-- lignes, PostgREST refuse l'appel RPC pour anon/authenticated (permission
-- denied) meme si la fonction ne touche que des tables en lecture publique.
grant execute on function fn_normaliser_terme(text) to anon, authenticated, service_role;
grant execute on function fn_resoudre_allergene(text) to anon, authenticated, service_role;
