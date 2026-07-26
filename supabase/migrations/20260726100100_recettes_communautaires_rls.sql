-- COUR-29 : RLS de `recettes` jusqu'ici `recettes_read using (true)`
-- (n'importe qui pouvait lire n'importe quelle recette, y compris un
-- brouillon en cours de redaction) et `recettes_write for all using
-- (auteur_id = auth.uid())` (un seul bloc pour insert/update/delete, sans
-- distinguer les cas). Remplace par des policies dediees qui : limitent la
-- lecture aux recettes publiees + les siennes + celles vues par un
-- moderateur ; restreignent la creation aux recettes communautaires de
-- l'auteur lui-meme (jamais le catalogue officiel, reserve a service_role
-- via l'import CSV, COUR-17) ; autorisent un moderateur a modifier
-- n'importe quelle recette (passage a 'refusee'/'publiee').
--
-- Moderateur = `profils.est_admin` (colonne deja existante depuis COUR-9,
-- jamais reliee a une regle RLS jusqu'ici) : pas de table de roles dediee,
-- perimetre "minimal" du critere du ticket.
drop policy if exists recettes_read on recettes;
create policy recettes_read on recettes for select
  using (
    statut_publication = 'publiee'
    or auteur_id = auth.uid()
    or exists (select 1 from profils p where p.id = auth.uid() and p.est_admin)
  );

drop policy if exists recettes_write on recettes;

create policy recettes_insert on recettes for insert
  with check (auteur_id = auth.uid() and est_communautaire = true);

create policy recettes_update on recettes for update
  using (
    auteur_id = auth.uid()
    or exists (select 1 from profils p where p.id = auth.uid() and p.est_admin)
  )
  with check (
    auteur_id = auth.uid()
    or exists (select 1 from profils p where p.id = auth.uid() and p.est_admin)
  );

create policy recettes_delete on recettes for delete
  using (auteur_id = auth.uid());

-- Signalements : un moderateur doit pouvoir lire TOUS les signalements
-- (pas seulement les siens, `signalement_read_own` deja en place) et les
-- faire transiter (en_attente -> examine/supprime/valide) — aucune des
-- deux regles n'existait jusqu'ici (pas de UPDATE du tout sur cette table).
drop policy if exists signalement_read_moderateur on signalements;
create policy signalement_read_moderateur on signalements for select
  using (exists (select 1 from profils p where p.id = auth.uid() and p.est_admin));

drop policy if exists signalement_update_moderateur on signalements;
create policy signalement_update_moderateur on signalements for update
  using (exists (select 1 from profils p where p.id = auth.uid() and p.est_admin))
  with check (exists (select 1 from profils p where p.id = auth.uid() and p.est_admin));
