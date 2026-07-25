-- COUR-26 : migration best-effort des donnees de `planning_repas` (jsonb
-- opaque) vers `repas_planifies` (date reelle, une ligne par creneau).
--
-- 0 ligne en production au moment d'ecrire cette migration (reverifie via
-- l'API Management avant de l'ecrire, meme demarche que COUR-14/15/16) :
-- ce bloc s'execute donc sans effet reel aujourd'hui. Il reste correct et
-- idempotent (`on conflict do nothing`) si jamais rejoue sur un
-- environnement qui contiendrait des lignes. Aucun code applicatif n'a
-- jamais ecrit dans `planning_repas.repas` (jamais lue par l'app, voir
-- SCHEMA_INVENTORY.md) : la forme exacte du jsonb n'est donc garantie par
-- aucun contrat reel. Cette migration suppose la forme miroir du store
-- local historique (stores/planningStore.ts / PlanningHebdomadaire) --
-- `{"lundi": {"midi": {"recette_id": "...", "portions": n}, "soir": {...},
-- "midiIgnore": bool, "soirIgnore": bool}, ...}` -- et ignore silencieusement
-- (sans erreur) toute ligne qui ne correspond pas a cette forme : les
-- extractions jsonb renvoient simplement null, filtrees par le where.
insert into repas_planifies (profil_id, date_repas, moment, ignore, recette_id, portions, membre_ids)
select
  pr.profil_id,
  pr.semaine_debut + creneau.offset_jours,
  creneau.moment,
  coalesce((pr.repas -> creneau.jour ->> (creneau.moment || 'Ignore'))::boolean, false) as ignore,
  nullif(pr.repas -> creneau.jour -> creneau.moment ->> 'recette_id', '')::uuid as recette_id,
  nullif(pr.repas -> creneau.jour -> creneau.moment ->> 'portions', '')::integer as portions,
  '{}'::uuid[]
from planning_repas pr
cross join (
  values
    (0, 'lundi', 'midi'), (0, 'lundi', 'soir'),
    (1, 'mardi', 'midi'), (1, 'mardi', 'soir'),
    (2, 'mercredi', 'midi'), (2, 'mercredi', 'soir'),
    (3, 'jeudi', 'midi'), (3, 'jeudi', 'soir'),
    (4, 'vendredi', 'midi'), (4, 'vendredi', 'soir'),
    (5, 'samedi', 'midi'), (5, 'samedi', 'soir'),
    (6, 'dimanche', 'midi'), (6, 'dimanche', 'soir')
) as creneau(offset_jours, jour, moment)
where pr.profil_id is not null
  and (
    (pr.repas -> creneau.jour -> creneau.moment ->> 'recette_id') is not null
    or (pr.repas -> creneau.jour ->> (creneau.moment || 'Ignore'))::boolean is true
  )
on conflict (profil_id, date_repas, moment) do nothing;
