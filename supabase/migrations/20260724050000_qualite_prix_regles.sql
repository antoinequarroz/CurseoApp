-- COUR-21 : duree de validite d'un prix, differenciee par TYPE DE DONNEE —
-- ici, la source de collecte (prix_historique.source, COUR-16). Une API
-- officielle d'enseigne est censee refleter le prix courant en temps quasi
-- reel (donc suspecte tres vite si vieille) ; une saisie manuelle suppose
-- une verification humaine au moment de la saisie (fenetre de confiance
-- plus longue, mais rarement mise a jour) ; le scraping est entre les
-- deux, aligne sur le cycle de promo hebdomadaire habituel en Suisse.
create table if not exists regles_fraicheur_prix (
  source text primary key,
  duree_validite_jours integer not null check (duree_validite_jours > 0),
  description text not null,
  constraint regles_fraicheur_prix_source_check check (source = any (array['scraping', 'api_enseigne', 'saisie_manuelle']))
);

insert into regles_fraicheur_prix (source, duree_validite_jours, description) values
  ('api_enseigne', 3, 'API officielle d''enseigne : prix cense etre a jour en temps quasi reel, suspect tres vite si ancien.'),
  ('scraping', 14, 'Scraping automatise : aligne sur le cycle de promo hebdomadaire habituel en Suisse (2 semaines de marge).'),
  ('saisie_manuelle', 30, 'Saisie manuelle verifiee par un humain au moment de la collecte, mais rarement remise a jour.')
on conflict (source) do nothing;
