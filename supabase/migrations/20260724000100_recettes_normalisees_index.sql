-- COUR-14 : index correspondant aux filtres reellement utilises.
--
-- idx_recette_ingredients_recette / idx_recette_etapes_recette : necessaires
-- pour "lire une recette complete" (jointure recettes -> ses lignes), c'est
-- le critere de verification meme du ticket.
--
-- idx_recettes_statut_publication : partiel sur 'publiee', meme pattern que
-- idx_recettes_communautaires (COUR-9) — toute liste publique de recettes
-- devra filtrer sur ce statut en priorite pour ne jamais exposer un
-- brouillon.
--
-- Pas d'index sur ingredients.rayon ni recette_ingredients.ingredient_id :
-- aucun filtre reel de ce type dans l'app aujourd'hui (voir hooks/useRecettes.ts,
-- qui filtre uniquement par regime/allergenes — deja indexes en GIN depuis
-- COUR-9), à ajouter le jour ou un vrai besoin apparait plutot que par
-- anticipation.
create index if not exists idx_recette_ingredients_recette on recette_ingredients using btree (recette_id);
create index if not exists idx_recette_etapes_recette on recette_etapes using btree (recette_id);
create index if not exists idx_recettes_statut_publication on recettes using btree (statut_publication) where statut_publication = 'publiee';
