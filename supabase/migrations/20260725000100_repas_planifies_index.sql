-- Index compose pour les requetes par intervalle ("mon planning entre deux
-- dates", chargement multi-semaines) : profil_id en egalite + date_repas en
-- range, l'ordre des colonnes compte pour un btree (egalite d'abord).
create index if not exists idx_repas_planifies_profil_date on repas_planifies (profil_id, date_repas);
create index if not exists idx_repas_planifies_recette on repas_planifies (recette_id);
