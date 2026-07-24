-- COUR-21 : "les prix expires ne sont pas utilises silencieusement" —
-- `prix_courant` (COUR-16) gagne une colonne `expire`, calculee a partir de
-- `regles_fraicheur_prix` (14 jours par defaut si la source n'est pas
-- reconnue, choix defensif plutot que de planter). `create or replace view`
-- peut AJOUTER une colonne a la fin sans probleme (contrairement a en
-- retirer une, voir la lecon de COUR-14/15) : pas besoin de drop/create ici.
create or replace view prix_courant as
select distinct on (ph.offre_id)
  ph.offre_id, om.produit_canonique_id, om.enseigne_id, om.format, om.quantite, om.unite,
  ph.prix, ph.prix_unitaire, ph.promotion, ph.source, ph.collecte_le,
  (ph.collecte_le < now() - (coalesce(rfp.duree_validite_jours, 14) || ' days')::interval) as expire
from prix_historique ph
join offres_magasin om on om.id = ph.offre_id
left join regles_fraicheur_prix rfp on rfp.source = ph.source
order by ph.offre_id, ph.collecte_le desc;

-- Doublons : un meme (offre, date de collecte) ne peut plus exister deux
-- fois. Contrainte stricte (rejet a l'insertion), pas un simple
-- avertissement — un vrai doublon exact ne devrait jamais arriver avec un
-- pipeline de collecte correct ; le rejeter fait remonter le bug plutot que
-- de le masquer silencieusement.
alter table prix_historique drop constraint if exists prix_historique_offre_collecte_unique;
alter table prix_historique add constraint prix_historique_offre_collecte_unique unique (offre_id, collecte_le);

-- "Quasi-doublons" : deux observations du MEME prix pour la MEME offre le
-- MEME jour calendaire (mais a des horodatages differents, donc pas
-- bloquees par la contrainte ci-dessus) — signale une collecte redondante
-- probable (ex. le meme scraping relance deux fois), a surveiller sans
-- bloquer l'insertion (contrairement au cas exact ci-dessus, celui-ci n'est
-- pas forcement une erreur : un prix peut legitimement rester identique).
create or replace view prix_doublons_suspects as
select offre_id, prix, prix_unitaire, date(collecte_le) as jour, count(*) as nb_observations
from prix_historique
group by offre_id, prix, prix_unitaire, date(collecte_le)
having count(*) > 1;

-- Variations extremes : compare chaque observation a la precedente pour la
-- MEME offre. Seuil de 50% choisi comme heuristique de signalement (une
-- vraie promo peut depasser -50%, donc ceci ne rejette rien automatiquement,
-- voir QUALITE_PRIX.md) — juste un flag pour revue humaine.
create or replace view prix_anomalies as
select
  ph.id, ph.offre_id, ph.prix, ph.prix_unitaire, ph.collecte_le,
  lag(ph.prix_unitaire) over (partition by ph.offre_id order by ph.collecte_le) as prix_unitaire_precedent,
  case
    when lag(ph.prix_unitaire) over (partition by ph.offre_id order by ph.collecte_le) is null then false
    else abs(ph.prix_unitaire - lag(ph.prix_unitaire) over (partition by ph.offre_id order by ph.collecte_le))
         / lag(ph.prix_unitaire) over (partition by ph.offre_id order by ph.collecte_le) > 0.5
  end as variation_extreme
from prix_historique ph;

-- Rapport de couverture/fraicheur par enseigne (COUR-21, critere "rapport").
create or replace view rapport_fraicheur_prix_par_enseigne as
select
  e.code as enseigne,
  count(distinct om.id) as nb_offres,
  count(distinct pc.offre_id) as nb_offres_avec_prix,
  count(distinct pc.offre_id) filter (where pc.expire) as nb_offres_expirees,
  round((extract(epoch from avg(now() - pc.collecte_le)) / 86400)::numeric, 1) as age_moyen_jours,
  round((extract(epoch from max(now() - pc.collecte_le)) / 86400)::numeric, 1) as age_max_jours
from enseignes e
left join offres_magasin om on om.enseigne_id = e.id
left join prix_courant pc on pc.offre_id = om.id
group by e.code;
