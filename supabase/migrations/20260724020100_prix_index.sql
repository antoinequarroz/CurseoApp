-- COUR-16 : index sur les 3 axes de recherche demandes par le ticket —
-- produit, enseigne, fraicheur.
create index if not exists idx_offres_magasin_produit on offres_magasin using btree (produit_canonique_id);
create index if not exists idx_offres_magasin_enseigne on offres_magasin using btree (enseigne_id);
-- (offre_id, collecte_le desc) : sert a la fois "l'historique d'une offre
-- trie par date" ET le prix courant (derniere ligne = collecte_le max),
-- voir la vue `prix_courant` qui s'appuie directement sur cet ordre.
create index if not exists idx_prix_historique_offre_collecte on prix_historique using btree (offre_id, collecte_le desc);
