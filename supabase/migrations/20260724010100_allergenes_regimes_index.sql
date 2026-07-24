-- COUR-15 : index sur les sens de requete reels — "les allergenes/regimes
-- d'une recette" (recette_id) et "les recettes portant cet allergene/regime"
-- (allergene_id/regime_id), symetrique au filtrage regime/allergies deja
-- fait cote app (hooks/useRecettes.ts) mais qui devra passer par ces tables
-- une fois le backend reellement branche. idx_ingredient_allergenes_allergene :
-- necessaire a la deduction (recette_allergenes_effectifs, migration
-- suivante) qui joint par allergene_id.
create index if not exists idx_recette_allergenes_recette on recette_allergenes using btree (recette_id);
create index if not exists idx_recette_allergenes_allergene on recette_allergenes using btree (allergene_id);
create index if not exists idx_recette_regimes_recette on recette_regimes using btree (recette_id);
create index if not exists idx_recette_regimes_regime on recette_regimes using btree (regime_id);
create index if not exists idx_ingredient_allergenes_allergene on ingredient_allergenes using btree (allergene_id);
