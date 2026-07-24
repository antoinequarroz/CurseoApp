-- COUR-21 : `regles_fraicheur_prix` est un referentiel — lecture publique,
-- ecriture geree par migration uniquement (meme pattern que unites_mesure,
-- allergenes, regimes...).
alter table regles_fraicheur_prix enable row level security;
drop policy if exists regles_fraicheur_prix_read on regles_fraicheur_prix;
create policy regles_fraicheur_prix_read on regles_fraicheur_prix for select using (true);
