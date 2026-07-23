-- COUR-9 : index existants en production, jamais versionnes.

create index if not exists idx_commandes_profil on commandes using btree (profil_id, created_at desc);
create index if not exists idx_favoris_profil on favoris using btree (profil_id);
create index if not exists idx_courses_profil on listes_courses using btree (profil_id);
create index if not exists idx_courses_planning on listes_courses using btree (planning_id);
create index if not exists idx_notifications_profil on notifications using btree (profil_id, created_at desc);
create index if not exists idx_planning_profil on planning_repas using btree (profil_id);
create index if not exists idx_planning_semaine on planning_repas using btree (profil_id, semaine_debut desc);
create index if not exists idx_rate_limits on rate_limits using btree (user_id, endpoint, window_start);
create index if not exists idx_recettes_communautaires on recettes using btree (est_communautaire) where est_communautaire = true;
create index if not exists idx_recettes_allergenes on recettes using gin (allergenes);
create index if not exists idx_recettes_regime on recettes using gin (regime);
create index if not exists idx_swipes_recette on swipes using btree (recette_id);
create index if not exists idx_swipes_profil on swipes using btree (profil_id);
