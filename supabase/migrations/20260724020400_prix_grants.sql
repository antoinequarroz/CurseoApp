-- COUR-16 : contrairement au pattern "grant all" utilise pour les tables
-- catalogue (COUR-14/15), ici SEUL service_role recoit tous les privileges
-- (c'est lui qui alimentera prix_historique depuis le pipeline de
-- collecte). anon/authenticated recoivent uniquement SELECT — coherent avec
-- les policies RLS (aucune policy d'ecriture pour ces roles) et avec le
-- critere du ticket "acces Data API explicitement configures" : sans cette
-- ligne, PostgREST refuserait toute lecture (RLS + grants sont tous les
-- deux necessaires, RLS ne suffit pas si le GRANT de base manque).
grant select on table enseignes, produits_canoniques, offres_magasin, prix_historique, prix_courant
to anon, authenticated;

grant all on table enseignes, produits_canoniques, offres_magasin, prix_historique
to service_role;

grant select on table prix_courant to service_role;
