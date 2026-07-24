-- COUR-21 : lecture seule pour anon/authenticated (meme divergence
-- volontaire qu'en COUR-16 : donnees de pipeline, pas de saisie
-- utilisateur), acces complet pour service_role.
grant select on table regles_fraicheur_prix to anon, authenticated;
grant all on table regles_fraicheur_prix to service_role;

-- Vues : lecture seule pour tout le monde, y compris service_role (ce sont
-- des calculs, rien a ecrire dessus).
grant select on table prix_doublons_suspects to anon, authenticated, service_role;
grant select on table prix_anomalies to anon, authenticated, service_role;
grant select on table rapport_fraicheur_prix_par_enseigne to anon, authenticated, service_role;

-- prix_courant a change de definition (colonne `expire` ajoutee) mais garde
-- le meme OID (create or replace, pas drop+create) : les grants de COUR-16
-- restent valides, rien a refaire ici.
