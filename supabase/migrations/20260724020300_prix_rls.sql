-- COUR-16 : "RLS et acces Data API explicitement configures" — a la
-- difference des tables catalogue COUR-14/15 (ingredients, allergenes...)
-- ouvertes en ecriture aux utilisateurs authentifies, les donnees de prix
-- viennent d'un pipeline de collecte automatise (scraping/API enseignes),
-- pas d'une saisie utilisateur. Choix explicite : lecture publique (SELECT
-- using true) pour que l'app puisse comparer les prix sans authentification,
-- AUCUNE policy INSERT/UPDATE/DELETE pour anon/authenticated — donc
-- refusees par defaut. Seul service_role (qui contourne RLS, utilise par le
-- futur job de collecte) peut ecrire. Voir la migration grants pour le
-- pendant cote privileges bruts.

alter table enseignes enable row level security;
drop policy if exists enseignes_read on enseignes;
create policy enseignes_read on enseignes for select using (true);

alter table produits_canoniques enable row level security;
drop policy if exists produits_canoniques_read on produits_canoniques;
create policy produits_canoniques_read on produits_canoniques for select using (true);

alter table offres_magasin enable row level security;
drop policy if exists offres_magasin_read on offres_magasin;
create policy offres_magasin_read on offres_magasin for select using (true);

alter table prix_historique enable row level security;
drop policy if exists prix_historique_read on prix_historique;
create policy prix_historique_read on prix_historique for select using (true);
