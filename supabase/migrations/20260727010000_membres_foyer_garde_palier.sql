-- COUR-35 : "aucun etat local ne permet de contourner un droit". La garde
-- Famille sur l'ajout de membres du foyer n'existait qu'a un seul endroit
-- cote client (app/membres-foyer.tsx, `estAuMoins('famille')`) — un
-- utilisateur authentifie gratuit/standard/premium pouvait ajouter des
-- membres en appelant directement l'API REST Supabase
-- (POST /rest/v1/membres_foyer), contournant totalement le paywall : la RLS
-- existante (20260724060200_foyers_membres_rls.sql) ne verifie que la
-- propriete (`responsable_id = auth.uid()`), jamais le palier. Idem pour la
-- limite de 6 membres (LIMITE_MEMBRES_FAMILLE, hooks/useMembresFoyer.ts),
-- purement cote app jusqu'ici, aucune contrainte DB.
--
-- Trigger plutot que RLS `with check` supplementaire : un message d'erreur
-- explicite (`raise exception`) remonte tel quel au client via l'erreur
-- Postgres, alors qu'un rejet RLS renverrait le message generique
-- "new row violates row-level security policy", moins utile pour
-- diagnostiquer un contournement tente.
--
-- Delete/update non gardes par palier (uniquement par propriete, comme
-- avant) : un responsable retrograde de Famille a un palier inferieur doit
-- pouvoir retirer/corriger des membres existants pour redescendre sous la
-- limite, sans etre bloque — seul l'AJOUT d'un nouveau membre consomme la
-- valeur du palier Famille.
create or replace function fn_verifier_ajout_membre_foyer()
returns trigger
language plpgsql
as $$
declare
  abonnement_responsable text;
  nb_membres_existants integer;
begin
  -- service_role (seed, scripts de verification, futur outillage support)
  -- contourne cette garde comme il contourne deja la RLS — la garde vise
  -- les ecritures d'un UTILISATEUR final (anon/authenticated), pas les
  -- operations de confiance cote serveur.
  if auth.role() = 'service_role' then
    return new;
  end if;

  select p.abonnement into abonnement_responsable
  from foyers f
  join profils p on p.id = f.responsable_id
  where f.id = new.foyer_id;

  if abonnement_responsable is distinct from 'famille' then
    raise exception 'ajouter un membre du foyer necessite le palier Famille';
  end if;

  select count(*) into nb_membres_existants from membres_foyer where foyer_id = new.foyer_id;
  -- Doit rester synchronise avec LIMITE_MEMBRES_FAMILLE (hooks/useMembresFoyer.ts).
  if nb_membres_existants >= 6 then
    raise exception 'limite de 6 membres du foyer atteinte';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_verifier_ajout_membre_foyer on membres_foyer;
create trigger trg_verifier_ajout_membre_foyer
  before insert on membres_foyer
  for each row execute function fn_verifier_ajout_membre_foyer();
