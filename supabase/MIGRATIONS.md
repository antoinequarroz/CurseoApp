# Procédure — créer une nouvelle migration Supabase (COUR-9)

## ⚠️ Leçon de COUR-10 : toujours tester l'ordre chronologique complet

Ma première vérification (transaction annulée sur schéma vide) ne testait
QUE mes nouveaux fichiers concaténés entre eux — pas rejoués dans l'ordre
chronologique **avec les migrations déjà existantes**. Résultat : ça passait
mes tests, mais `supabase db reset` en conditions réelles (première
exécution avec Docker sur la machine du développeur) a échoué :
`20260715080000_enable_rls_waitlist_rate_limits.sql` (RLS sur `waitlist`/
`rate_limits`) s'exécutait **avant** `20260714000000_recreate_tables.sql`
(qui crée ces tables) — sauf qu'à l'origine ce dernier fichier s'appelait
`20260723150000...`, donc chronologiquement APRÈS le fichier de 2026-07-15.
Renommé pour corriger l'ordre.

**Retenir pour la prochaine fois** : toujours boucler sur `ls
supabase/migrations/*.sql` dans l'ordre du nom de fichier (pas juste les
fichiers qu'on vient d'écrire) pour la vérification par transaction annulée
— c'est le seul moyen de reproduire fidèlement ce que `supabase db reset`
fait vraiment.

Depuis ce ticket, **`supabase/migrations/` est la source de vérité du schéma**.
`supabase/schema.sql` est conservé pour l'historique mais ne doit plus être
exécuté à la main — voir l'en-tête de ce fichier.

## Créer une migration

1. `npx supabase migration new <nom_court_en_snake_case>` — crée un fichier
   vide horodaté dans `supabase/migrations/`.
2. Écrire le SQL. Règles :
   - **Idempotent** : `create table if not exists`, `create or replace view`,
     `create index if not exists`, `drop policy if exists x on y; create policy x ...`.
     Une migration qui échoue si rejouée sur une base qui l'a déjà appliquée
     casse le critère « s'applique sans intervention manuelle ».
   - **Une responsabilité par fichier** si possible (tables / index / policies /
     grants séparés) — plus facile à relire et à identifier en cas de rollback.
   - Jamais de secret, de clé, ni de donnée réelle dans une migration.
3. **Vérifier avant de committer**, sans toucher à la prod, avec une
   transaction annulée sur un schéma temporaire vide :

   ```sql
   begin;
   create schema migration_test_temp;
   set local search_path to migration_test_temp;
   -- coller ici le contenu de la/les migration(s) a tester
   rollback;
   ```

   Envoyer ça via `npx supabase db execute` (ou l'API Management si le CLI
   n'est pas lié) confirme que le SQL est valide **et** qu'il crée vraiment
   les objets (contrairement à un test direct sur la prod existante, où
   `if not exists` masquerait une erreur de définition).

4. Committer le fichier de migration.

## Appliquer une migration

- **Nouvel environnement / reset local** : `npx supabase db reset` (nécessite
  Docker — non disponible dans cet environnement de développement, à tester
  sur un poste avec Docker Desktop).
- **Projet distant lié** : `npx supabase db push` — applique les migrations
  locales non encore marquées comme appliquées côté distant.
- **Lier le CLI à un projet** : `npx supabase link --project-ref <ref>` avec
  `SUPABASE_ACCESS_TOKEN` en variable d'environnement (déjà présent dans
  `.env.development`).

## Rattrapage effectué par ce ticket (COUR-9)

Le schéma de production existait déjà en intégralité (voir
`SCHEMA_INVENTORY.md`, COUR-8) mais une seule migration était versionnée.
Les fichiers `20260714000000` (tables), `20260723150100` à `20260723150500`
(vues, index, RLS, policies, grants, storage) recréent fidèlement l'état
actuel de façon idempotente. Vérifiés par transaction annulée (`begin` /
`rollback`) contre la prod et contre un schéma vide, **puis marqués comme
déjà appliqués** côté distant via `supabase migration repair --status
applied` (fait le 2026-07-23) — sans jamais avoir été réellement rejoués
contre la prod, puisque les objets y existaient déjà.

`20260723160000` corrige une vraie divergence de sécurité trouvée en route
(policy storage `images_write` trop permissive) et a été, elle, réellement
exécutée contre la prod avant d'être marquée appliquée.

Cette commande ne modifie que la table de suivi `supabase_migrations.schema_migrations`
(bookkeeping), jamais le schéma ni les données — mais c'est une action contre
l'infrastructure de production réelle, donc volontairement laissée à une
confirmation explicite plutôt que lancée automatiquement.

## COUR-14 : recettes/ingredients normalises

`recettes.ingredients` (jsonb) et `recettes.etapes` (text[]) — denormalises,
irrecuperables par contrainte SQL — remplaces par `ingredients` (catalogue
partage), `recette_ingredients` (lignes quantite/unite par recette) et
`recette_etapes` (etapes numerotees). `unites_mesure` ajoutee comme table de
reference plutot qu'un enum fige. Fait sans risque de perte de donnees :
`recettes` avait 0 ligne en production au moment du ticket (verifie via
l'API Management avant d'ecrire la migration).

Piege rencontre : `create or replace view` ne peut pas retirer de colonnes
(seulement en ajouter a la fin) — `recettes_a_moderer` selectionnait
`r.ingredients`/`r.etapes`. Il a fallu `drop view` + `create view` (nouvel
OID ⇒ regrant necessaire) **avant** le `alter table drop column`, sinon
Postgres refuse ("other objects depend on it"). Voir
`20260724000000_recettes_normalisees_tables.sql`.

Types TypeScript versionnes : `supabase/database.types.ts`, genere via
`npm run supabase:types` (= `supabase gen types typescript --local`) contre
l'environnement de validation local, a regenerer apres toute migration qui
touche au schema.

## COUR-15 : allergenes/regimes/synonymes structures

`recettes.regime`/`allergenes` (text[]) remplaces par des tables : `allergenes`,
`regimes` (referentiels), `synonymes_allergenes` (arachide/cacahuète et
variantes — voir `fn_resoudre_allergene`), `ingredient_allergenes` (allergene
porte par un ingredient du catalogue, avec `certitude` confirme/possible),
`recette_allergenes`/`recette_regimes` (declarations explicites de l'auteur).
La vue `recette_allergenes_effectifs` fait l'union declare+deduit : une ligne
`certitude = 'possible'` n'est JAMAIS filtree ni requalifiee en 'confirme' —
c'est ce qui garantit qu'un cas ambigu (ex. Quinoa → trace de gluten par
contamination croisee) reste visible comme ambigu plutot que d'etre traite
comme sur. Meme constat qu'en COUR-14 : `recettes` avait 0 ligne en
production, changement destructif sans risque reel.

Piege rencontre (bash/git-bash sur Windows) : passer un caractere accentue
litteral (`è`) dans une commande `curl -d` transcode silencieusement l'UTF-8
en un jeu de caracteres a un octet, ce qui casse le JSON cote PostgREST
(`PGRST102`). Contournement dans `scripts/verify-allergenes.sh` : utiliser
l'echappement JSON `\uXXXX` (ASCII pur, aucune ambiguite d'encodage) plutot
que le caractere accentue directement dans les commandes shell.

Tests de la matrice ingredients/synonymes/allergenes/regimes :
`scripts/verify-allergenes.sh`, execute manuellement (verification du
ticket) et par la CI (`supabase-migrations`, apres `verify-supabase-seed.sh`).

## COUR-16 : enseignes/produits/historique des prix

`enseignes`, `produits_canoniques`, `offres_magasin` (format/quantite/unite
par enseigne — unite CONTRAINTE a g/kg/ml/l/unite pour rester comparable,
voir `offres_magasin_unite_comparable`), `prix_historique` (table
d'evenements append-only : chaque observation est une nouvelle ligne, jamais
une mise a jour — c'est ca "l'historique"). Vue `prix_courant` = derniere
ligne par offre.

Difference volontaire avec COUR-14/15 : RLS + grants sont restrictifs en
ecriture (`grant select` seulement pour anon/authenticated, `grant all`
uniquement pour service_role) — les prix viennent d'un pipeline de collecte
automatise, pas d'une saisie utilisateur, donc pas de policy INSERT ouverte
comme pour `ingredients`. C'est le sens du critere du ticket "RLS et acces
Data API sont explicitement configures" : explicitement LECTURE SEULE cote
client, pas juste "RLS activee par defaut".

Tests : `scripts/verify-prix.sh` (comparaison de formats via
`prix_unitaire`, prix courant = plus recent, historique conserve, ecriture
anon refusee), execute manuellement et en CI.

## COUR-17 : pipeline d'import CSV recettes

`recettes.cle_externe` (nullable, unique) ajoutee comme cle d'idempotence.
`fn_importer_recettes_csv(lignes jsonb, dry_run boolean)` porte TOUTE la
validation (champs, unites, doublons, references) et l'ecriture atomique
(upsert sur `cle_externe` + remplacement complet des lignes filles) —
accessible uniquement a `service_role` (`revoke ... from public`), jamais
a anon/authenticated : c'est un outil d'operateur, pas une fonctionnalite
app. Le script Node (`scripts/import-recettes-csv.mjs`) ne fait QUE le
parsing CSV -> JSON, aucune logique de decision cote Node — voir
`supabase/IMPORT_RECETTES_CSV.md` pour le format et les regles.

Piege rencontre : une variable PL/pgSQL nommee `code` entrait en conflit
avec la colonne `regimes.code`/`allergenes.code` dans les memes requetes
(`column reference "code" is ambiguous`) — renommee `v_code`. A eviter :
nommer une variable PL/pgSQL comme une colonne frequemment utilisee dans
la meme fonction.

Tests : `scripts/verify-import-csv.sh` reproduit la Verification litterale
du ticket (fichier valide importe deux fois -> idempotent, fichier avec
erreurs connues -> tout rejete), execute manuellement et en CI.

## ⚠️ Divergence de sécurité trouvée pendant ce ticket

`supabase/schema.sql` (l'ancien fichier appliqué à la main) définit la policy
`images_write` du bucket `images` avec une restriction par dossier
(`auth.uid()::text = (storage.foldername(name))[2]`). **La policy réellement
déployée en production n'a aucune restriction** (`with check` vide) — voir
`SCHEMA_INVENTORY.md` §4. La migration `20260723150500_storage.sql` reproduit
fidèlement l'état **réel de production** (non restreint), conformément au
périmètre de ce ticket ("récupérer l'existant", pas le corriger) — mais ça
ressemble à une régression accidentelle plutôt qu'à un choix voulu. **Décision
à prendre séparément** : restaurer la policy restrictive d'origine, ou
confirmer que l'ouverture est intentionnelle.

## COUR-23 : foyers et membres du foyer

`foyers` (id, `responsable_id` -> `profils(id)`, unique — un compte
authentifié est responsable d'au plus un foyer) et `membres_foyer` (id,
`foyer_id`, `profil_id` nullable, `prenom`, `est_responsable`, `age`,
`regime`/`allergies`/`objectifs` en `text[]`, champs `gouts_*` repris du
sondage local `stores/goutsStore.ts`). `profil_id` nullable **exprès** :
un membre sans compte de connexion (ex. jeune enfant) doit exister comme
ligne à part entière, protégée comme les autres par `foyer_id` — jamais par
sa propre identité puisqu'il n'en a pas. `profils.regime/allergies/objectifs`
(agrégés, foyer entier) restent inchangés : ce ticket est un ajout de schéma
pur, pas un branchement client — voir COUR-24/COUR-25 (bloqués par ce
ticket) pour l'UI.

Isolation RLS : clé = `foyer_id` via `foyers.responsable_id = auth.uid()`,
jamais `profil_id` seul (sinon un membre sans compte ne serait protégé par
rien). Le responsable a un accès total (`for all`) sur les membres de son
foyer ; un membre avec son propre compte peut en plus lire (jamais modifier)
sa propre ligne via une deuxième policy `for select` — Postgres combine les
policies `for select` en OR, ça s'ajoute donc à l'accès du responsable sans
le remplacer.

Contrairement aux `verify-*.sh` précédents (anon vs service_role),
`scripts/verify-foyers-membres.sh` crée deux **vrais comptes authentifiés
distincts** via l'API Admin GoTrue (`/auth/v1/admin/users` + `/auth/v1/token
?grant_type=password`) pour tester une isolation RLS réellement keyed sur
`auth.uid()` — aucun script précédent ne testait la RLS entre deux comptes
distincts, seulement anon/service_role. Reproduit la Vérification littérale
du ticket : deux foyers créés, isolation démontrée (foyer B invisible et non
modifiable par l'utilisateur A, membre sans compte visible uniquement par le
responsable de son propre foyer), exécuté manuellement et en CI.

## COUR-26 : planning daté multi-semaines (`repas_planifies`)

Remplace la "semaine courante implicite" (`planning_repas`, table
provisionnée en COUR-9 mais **jamais lue par l'app** — le planning vivait
uniquement dans `stores/planningStore.ts`, un objet local keyé par nom de
jour, sans date réelle) par `repas_planifies` : une ligne par créneau réel
(`profil_id`, `date_repas`, `moment`).

`planning_repas` n'est **pas supprimée** : `listes_courses.planning_id` la
référence encore et `listes_courses` est utilisée en production (contraire
à `planning_repas`) — toucher cette FK sort du périmètre de ce ticket. La
décision de retirer `planning_repas` reste un choix produit séparé, déjà
noté comme tel dans `SCHEMA_INVENTORY.md`.

Comportement temporel (critère du ticket) : une ligne n'existe que pour un
créneau **décidé** (recette assignée OU explicitement ignorée via
`ignore=true`) — "pas encore décidé" reste l'absence de ligne, jamais un
troisième état stocké. Contrainte `repas_planifies_coherence` qui
l'impose : `ignore` et `recette_id` ne sont jamais tous les deux
vrais/renseignés, ni tous les deux faux/vides.

`unique (profil_id, date_repas, moment)` = le "doublon impossible" du
critère. Index composé `(profil_id, date_repas)` pour les requêtes par
intervalle (chargement multi-semaines, `date_repas=gte...&date_repas=lte...`).
RLS identique au pattern `planning_own` existant : `auth.uid() = profil_id`.

`membre_ids uuid[]` (COUR-25) : tableau simple sans intégrité référentielle
(Postgres ne permet pas de FK sur les éléments d'un array), même niveau de
rigueur que `profils.regime`/`allergies`.

Migration des données existantes : 0 ligne en production au moment
d'écrire cette migration (revérifié via l'API Management, même démarche que
COUR-14/15/16) — le bloc `INSERT ... SELECT` de
`20260725000400_repas_planifies_migration_donnees.sql` s'exécute donc sans
effet réel aujourd'hui, mais reste correct et idempotent
(`on conflict do nothing`) si rejoué sur un environnement contenant des
lignes. Comme `planning_repas.repas` (jsonb) n'a jamais été écrite par
l'app, sa forme exacte n'est garantie par aucun contrat réel ; la migration
suppose la forme miroir de l'ancien store local
(`{"lundi": {"midi": {"recette_id":...,"portions":...}, "soirIgnore":bool}, ...}`)
et ignore silencieusement toute ligne qui ne correspond pas à cette forme.
Vérifiée manuellement via `docker exec ... psql` avec une ligne
`planning_repas` synthétique de cette forme (voir historique de la
session) — pas testable via les scripts `verify-*.sh` (REST uniquement, pas
d'exécution SQL arbitraire).

Tests : `scripts/verify-repas-planifies.sh` reproduit la Vérification
littérale du ticket (plusieurs semaines chargées sans collision, requête
par intervalle correcte), plus doublon rejeté, cohérence ignore/recette
rejetée dans les deux sens, isolation RLS entre deux comptes réels (même
technique que COUR-23/24) — exécuté manuellement et en CI.

## COUR-28 : adresses de livraison (`adresses_livraison`)

Ticket mobile/profile/ux sans label backend, mais "Adresses de livraison
possède ajout, modification, suppression et validation" implique une vraie
persistance — recherche confirmée : aucune notion d'adresse n'existait nulle
part dans le schéma (contrairement à `repas_planifies`, provisionné avant
d'être branché, ici c'est un concept entièrement nouveau).

`npa` contraint par un `check` regex (`^[0-9]{4}$`, NPA suisse) en plus de
la validation Zod côté client (`lib/validation.ts`, `AdresseSchema`) — la
même règle des deux côtés, jamais une seule couche de défense. Une seule
adresse par défaut par profil via un index unique partiel
(`adresses_livraison_un_seul_defaut`) plutôt qu'un simple boolean sans
contrainte : le repository (`lib/adressesRepository.ts`) retire d'abord le
flag des autres adresses avant d'en poser un nouveau, sinon la contrainte
rejetterait l'écriture.

RLS identique au pattern `planning_own`/`repas_planifies_own` :
`auth.uid() = profil_id`.

Tests : `scripts/verify-adresses-livraison.sh` (CRUD complet, NPA invalide
rejeté, double défaut rejeté, isolation RLS) — exécuté manuellement et en
CI.

## COUR-29 : backend recettes communautaires + modération minimale

`recettes.statut_publication` n'autorisait jusqu'ici que `brouillon`,
`publiee`, `archivee`. Contrainte élargie (drop + re-create, Postgres n'a
pas d'`alter check` direct) à `en_attente` et `refusee` — les deux états de
modération du ticket — sans retirer `archivee`, toujours utilisé par le
pipeline d'import CSV (COUR-17, non touché).

Champs obligatoires avant soumission (source, droits sur l'image, au moins
un allergène déclaré) imposés par un trigger `before insert or update`
(`fn_verifier_recette_soumissible`), pas par un simple `check` : la règle
dépend d'une autre table (`recette_allergenes`) et ne s'applique qu'à la
transition `brouillon -> en_attente/publiee`, jamais à la création (une
recette communautaire naît toujours en brouillon — le trigger interdit
explicitement un INSERT direct dans un état post-brouillon). `droits_image`
est un champ texte libre (pas d'enum fermé : photo perso, banque libre de
droits, autorisation d'un tiers ne se prêtent pas à une liste fixe). Un
code allergène sentinelle `aucun` a été ajouté au référentiel (COUR-15) pour
qu'un auteur sans allergène réel à déclarer puisse quand même satisfaire la
règle "au moins une ligne déclarée" de bonne foi.

RLS de `recettes` resserrée : `recettes_read` limite désormais la lecture
aux recettes publiées, aux siennes, ou à celles vues par un modérateur
(auparavant `using (true)`, lisible par n'importe qui y compris les
brouillons). Le bloc unique `recettes_write for all` est éclaté en
`recettes_insert` (communautaire + auteur uniquement — jamais le catalogue
officiel, réservé à `service_role` via l'import CSV), `recettes_update`
(auteur ou modérateur) et `recettes_delete` (auteur seul).

Modérateur = `profils.est_admin`, colonne existante depuis COUR-9 mais
jamais reliée à une règle RLS jusqu'ici. Choix délibéré de ne pas créer de
table de rôles dédiée : périmètre minimal demandé par le ticket. Nouvelles
policies `signalement_read_moderateur` / `signalement_update_moderateur`
donnant à un modérateur la visibilité et le droit de traiter TOUS les
signalements (pas seulement les siens comme `signalement_read_own`).
`signalements` gagne `moderateur_id` et `traite_le` pour tracer qui a
traité un signalement et quand.

Tests : `scripts/verify-recettes-communautaires.sh` — trois comptes réels
(auteur, autre utilisateur, modérateur avec `est_admin=true`) : soumission
rejetée sans champs obligatoires puis acceptée une fois complète,
visibilité RLS (brouillon/en_attente invisibles pour l'autre utilisateur,
visibles pour le modérateur, publique une fois publiée), modification
bloquée pour l'autre utilisateur, retrait par l'auteur, signalement visible
seulement par son auteur et le modérateur, modification du signalement
réservée au modérateur.
