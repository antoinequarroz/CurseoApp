-- COUR-16 : prix courant = derniere ligne de prix_historique par offre.
-- `distinct on` s'appuie sur idx_prix_historique_offre_collecte (meme ordre
-- offre_id, collecte_le desc) pour rester efficace meme avec beaucoup
-- d'historique.
create or replace view prix_courant as
select distinct on (ph.offre_id)
  ph.offre_id, om.produit_canonique_id, om.enseigne_id, om.format, om.quantite, om.unite,
  ph.prix, ph.prix_unitaire, ph.promotion, ph.source, ph.collecte_le
from prix_historique ph
join offres_magasin om on om.id = ph.offre_id
order by ph.offre_id, ph.collecte_le desc;
