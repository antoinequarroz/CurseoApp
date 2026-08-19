-- COUR-70 : préférences d'équipement du foyer et besoins des recettes.
-- NULL sur le profil signifie « pas encore renseigné » (aucun filtre dur) ;
-- un tableau vide signifie que la personne a explicitement tout décoché.
alter table public.profils
  add column if not exists equipements_cuisine text[];

alter table public.recettes
  add column if not exists equipements_requis text[] not null default '{}'::text[];

alter table public.profils drop constraint if exists profils_equipements_cuisine_check;
alter table public.profils add constraint profils_equipements_cuisine_check
  check (
    equipements_cuisine is null
    or equipements_cuisine <@ array[
      'plaques_cuisson', 'four', 'micro_ondes', 'air_fryer',
      'mixeur', 'robot_cuisine', 'grill', 'cuiseur_vapeur'
    ]::text[]
  );

alter table public.recettes drop constraint if exists recettes_equipements_requis_check;
alter table public.recettes add constraint recettes_equipements_requis_check
  check (
    equipements_requis <@ array[
      'plaques_cuisson', 'four', 'micro_ondes', 'air_fryer',
      'mixeur', 'robot_cuisine', 'grill', 'cuiseur_vapeur'
    ]::text[]
  );

-- Le catalogue coursIA a été relu recette par recette : ses clés externes
-- portent un balisage explicite. Pour une future recette communautaire sans
-- clé catalogue, une déduction prudente sert uniquement de point de départ.
create or replace function public.deduire_equipements_recette(p_recette_id uuid)
returns text[]
language plpgsql
stable
set search_path = public
as $$
declare
  v_cle text;
begin
  select cle_externe into v_cle from public.recettes where id = p_recette_id;

  if v_cle ~ '^catalogue(-v1)?-r-[0-9]{3}$' then
    return array_remove(array[
      case when v_cle = any (array[
        'catalogue-r-003','catalogue-r-004','catalogue-r-005','catalogue-r-008',
        'catalogue-r-009','catalogue-r-010','catalogue-r-011','catalogue-r-013',
        'catalogue-r-014','catalogue-r-015','catalogue-v1-r-021','catalogue-v1-r-022',
        'catalogue-v1-r-023','catalogue-v1-r-024','catalogue-v1-r-025','catalogue-v1-r-026',
        'catalogue-v1-r-028','catalogue-v1-r-029','catalogue-v1-r-030','catalogue-v1-r-031',
        'catalogue-v1-r-032','catalogue-v1-r-033','catalogue-v1-r-034','catalogue-v1-r-035',
        'catalogue-v1-r-037','catalogue-v1-r-038','catalogue-v1-r-039','catalogue-v1-r-040',
        'catalogue-v1-r-041','catalogue-v1-r-042','catalogue-v1-r-045','catalogue-v1-r-046',
        'catalogue-v1-r-047','catalogue-v1-r-048','catalogue-v1-r-049','catalogue-v1-r-050',
        'catalogue-v1-r-051','catalogue-v1-r-052'
      ]) then 'plaques_cuisson' end,
      case when v_cle = any (array[
        'catalogue-r-004','catalogue-r-016','catalogue-r-018','catalogue-r-020',
        'catalogue-v1-r-026','catalogue-v1-r-027','catalogue-v1-r-036',
        'catalogue-v1-r-046','catalogue-v1-r-055'
      ]) then 'four' end,
      case when v_cle = any (array[
        'catalogue-r-009','catalogue-r-017','catalogue-v1-r-029',
        'catalogue-v1-r-030','catalogue-v1-r-054'
      ]) then 'mixeur' end
    ], null);
  end if;

  return array_remove(array[
    case when exists (select 1 from public.recette_etapes e where e.recette_id = p_recette_id and e.instruction ~* '(faire revenir|mijoter|saisir|po[eê]le|casserole|nacrer|dorer|fondue)') then 'plaques_cuisson' end,
    case when exists (select 1 from public.recette_etapes e where e.recette_id = p_recette_id and e.instruction ~* '(four|r[oô]tir|gratiner)') then 'four' end,
    case when exists (select 1 from public.recette_etapes e where e.recette_id = p_recette_id and e.instruction ~* '(mixer|mixeur)') then 'mixeur' end,
    case when exists (select 1 from public.recette_etapes e where e.recette_id = p_recette_id and e.instruction ~* '(micro[- ]?ondes?)') then 'micro_ondes' end,
    case when exists (select 1 from public.recette_etapes e where e.recette_id = p_recette_id and e.instruction ~* '(air ?fryer|friteuse [àa] air)') then 'air_fryer' end,
    case when exists (select 1 from public.recette_etapes e where e.recette_id = p_recette_id and e.instruction ~* '(cuiseur vapeur)') then 'cuiseur_vapeur' end
  ], null);
end;
$$;

create or replace function public.actualiser_equipements_recette()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recette_cible uuid;
begin
  recette_cible := case when tg_op = 'DELETE' then old.recette_id else new.recette_id end;
  update public.recettes
  set equipements_requis = public.deduire_equipements_recette(recette_cible)
  where id = recette_cible;

  if tg_op = 'UPDATE' and old.recette_id is distinct from new.recette_id then
    update public.recettes
    set equipements_requis = public.deduire_equipements_recette(old.recette_id)
    where id = old.recette_id;
  end if;
  return coalesce(new, old);
end;
$$;

revoke all on function public.deduire_equipements_recette(uuid) from public, anon, authenticated;
revoke all on function public.actualiser_equipements_recette() from public, anon, authenticated;

drop trigger if exists recette_etapes_actualise_equipements on public.recette_etapes;
create trigger recette_etapes_actualise_equipements
after insert or update of instruction, recette_id or delete on public.recette_etapes
for each row execute function public.actualiser_equipements_recette();

-- Premier balisage reproductible, y compris si les recettes existaient avant
-- l'installation du trigger.
update public.recettes r
set equipements_requis = public.deduire_equipements_recette(r.id)
where r.statut_publication = 'publiee';

comment on column public.profils.equipements_cuisine is
  'Équipements de cuisine utilisables par le foyer. NULL = préférence non renseignée.';
comment on column public.recettes.equipements_requis is
  'Équipements nécessaires pour suivre la recette telle qu écrite.';

-- La vue existante listait explicitement les colonnes : ajouter les nouveaux
-- champs à la fin préserve son contrat historique. security_invoker garantit
-- que la RLS du profil appelant reste appliquée.
create or replace view public.profils_actifs
with (security_invoker = true) as
select
  id, prenom, nb_personnes, nb_enfants, budget_hebdo, regime, allergies,
  objectifs, enseignes_favorites, abonnement, apparence, notifications_activees,
  notifications_planning, notifications_budget, notifications_promos,
  notifications_bilan, est_admin, cgvu_version_acceptee, cgvu_acceptee_le,
  deleted_at, created_at, enfants_ages, equipements_cuisine
from public.profils
where deleted_at is null;

-- Remplace la policy historique « FOR ALL USING » par une policy explicite :
-- l'UPDATE doit vérifier à la fois la ligne existante et la ligne résultante.
drop policy if exists profil_own on public.profils;
create policy profil_own on public.profils
  for all
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
