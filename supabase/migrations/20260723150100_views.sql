-- COUR-9 : vues existantes en production, jamais versionnees.

create or replace view profils_actifs as
select
  id, prenom, nb_personnes, nb_enfants, budget_hebdo, regime, allergies,
  objectifs, enseignes_favorites, abonnement, apparence, notifications_activees,
  notifications_planning, notifications_budget, notifications_promos,
  notifications_bilan, est_admin, cgvu_version_acceptee, cgvu_acceptee_le,
  deleted_at, created_at
from profils
where deleted_at is null;

-- Recettes communautaires signalees >= 3 fois en attente — file de moderation.
create or replace view recettes_a_moderer as
select
  r.id, r.titre, r.description, r.image_url, r.blurhash, r.temps_preparation,
  r.difficulte, r.cout_estime, r.calories, r.portions, r.regime, r.allergenes,
  r.ingredients, r.etapes, r.auteur_id, r.est_communautaire, r.created_at,
  count(s.id) as nb_signalements
from recettes r
left join signalements s on s.recette_id = r.id and s.statut = 'en_attente'
where r.est_communautaire = true
group by r.id
having count(s.id) >= 3
order by count(s.id) desc;
