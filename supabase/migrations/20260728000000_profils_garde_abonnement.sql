-- COUR-39 : en ecrivant les tests d'integration deux-utilisateurs, un trou
-- de securite est apparu sur `profils.abonnement`.
--
-- La seule policy sur profils (20260723150300_rls_policies.sql) est
-- `profil_own ... for all using (auth.uid() = id)` : elle garantit la
-- PROPRIETE de la ligne, jamais l'integrite des colonnes. Un utilisateur
-- authentifie pouvait donc s'auto-attribuer n'importe quel palier avec un
-- simple appel REST :
--   PATCH /rest/v1/profils?id=eq.<son_uid>  {"abonnement":"famille"}
-- ...et debloquer tous les droits payants sans jamais passer par un achat.
--
-- Cela rendait contournable la garde serveur ajoutee en COUR-35
-- (fn_verifier_ajout_membre_foyer), qui lit precisement `profils.abonnement`
-- pour autoriser l'ajout de membres du foyer : il suffisait de se declarer
-- 'famille' juste avant. L'intention etait pourtant deja documentee cote
-- client (stores/profilStore.ts, `refleterAbonnementLocal` : "n'ecrit JAMAIS
-- vers Supabase, le webhook RevenueCat reste l'unique source de verite
-- persistee, voir ADR-004") — mais rien ne l'imposait cote base.
--
-- Ce trigger fait de cette intention un invariant DB : seul service_role
-- (le webhook RevenueCat, supabase/functions/revenuecat-webhook/index.ts)
-- peut ecrire cette colonne.
--
-- Choix : ignorer silencieusement la valeur proposee par le client plutot
-- que `raise exception` comme en COUR-35. L'onboarding
-- (app/(auth)/onboarding.tsx, `finaliser`) envoie legitimement un upsert
-- contenant `abonnement: 'gratuit'` sur l'ensemble du profil ; lever une
-- exception casserait ce parcours pour un abonne payant qui refait son
-- onboarding (son upsert 'gratuit' serait rejete au lieu d'etre neutralise).
-- La bonne semantique ici est "le client n'a pas autorite sur ce champ,
-- sa valeur est ignoree", pas "la requete est invalide".
create or replace function fn_proteger_abonnement_profil()
returns trigger
language plpgsql
as $$
begin
  -- service_role (webhook RevenueCat, seed, scripts de verification)
  -- contourne cette garde, comme il contourne deja la RLS.
  if auth.role() = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Un profil cree par son proprietaire demarre toujours au palier
    -- gratuit ; seul le webhook peut ensuite le faire evoluer.
    new.abonnement := 'gratuit';
  else
    -- Toute tentative de modification de la colonne est neutralisee : les
    -- autres colonnes du meme UPDATE restent appliquees normalement
    -- (preferences, budget, notifications... via mettreAJourPreferences).
    new.abonnement := old.abonnement;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_proteger_abonnement_profil on profils;
create trigger trg_proteger_abonnement_profil
  before insert or update on profils
  for each row execute function fn_proteger_abonnement_profil();
