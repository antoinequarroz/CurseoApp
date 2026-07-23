# Déploiement et rollback du schéma (COUR-13)

Procédure à suivre pour toute migration touchant `supabase/migrations/` sur le
projet distant (`bpycfeyapuekmesmxnvd`). Objectif : réduire le risque en
production, pas de mise à jour "à l'aveugle".

## 1. Avant le déploiement

1. **La migration est déjà passée par la procédure de `MIGRATIONS.md`** :
   SQL idempotent, vérifié par transaction annulée (`begin`/`rollback`) sur
   un schéma vide — donc son contenu est déjà validé avant d'arriver ici.
2. **CI verte sur la PR** (COUR-12) : le job `supabase-migrations` a rejoué
   *toutes* les migrations dans l'ordre sur une base fraîche + vérifié le
   schéma/seed obtenus (`scripts/verify-supabase-seed.sh`). Une CI rouge =
   déploiement bloqué, sans exception.
3. **Qualifier la migration** : est-elle **destructive** ou non ?
   - Non destructive (ajout de table/colonne nullable, index, policy, vue,
     grant) → risque faible, rollback trivial (voir §4).
   - Destructive (`drop table`, `drop column`, `alter column ... not null`
     sans défaut, `truncate`, renommage de colonne/table, changement de type
     avec perte de précision) → **sauvegarde obligatoire avant d'appliquer**,
     voir §2.
4. **Vérifier qu'un backup récent existe** : le workflow `backup.yml` tourne
   tous les jours à 2h (dump `pg_dump --format=custom`, conservé 30 jours en
   artefact GitHub Actions, `Actions → Daily Supabase Backup`). Si la
   migration est destructive et que le dernier backup date de plus de
   quelques heures, lancer manuellement `workflow_dispatch` sur `backup.yml`
   et attendre sa fin avant de continuer.

## 2. Migrations destructives — sauvegarde obligatoire

En plus du backup quotidien automatique, pour toute migration destructive :

1. Déclencher `backup.yml` manuellement (`gh workflow run backup.yml` ou
   depuis l'onglet Actions) juste avant le déploiement, pour avoir un point
   de restauration à quelques minutes du changement, pas à 24h.
2. Télécharger l'artefact produit (`db-backup-<run_id>`) et vérifier qu'il
   n'est pas vide avant de continuer — un backup qu'on n'a jamais vérifié
   n'est pas un backup.
3. Noter le nom de l'artefact et le timestamp dans la description de la PR
   ou le ticket, pour le retrouver rapidement en cas de restauration.
4. Pour une opération particulièrement risquée (ex. `drop column` sur une
   table à fort trafic), préférer une migration en deux temps plutôt qu'une
   suppression immédiate : rendre la colonne inutilisée par le code
   d'abord, la supprimer dans une migration séparée au sprint suivant.
   Ça donne une fenêtre de rollback applicatif sans toucher à la base.

## 3. Appliquer le déploiement

```bash
npx supabase link --project-ref bpycfeyapuekmesmxnvd
npx supabase db push
```

`db push` n'applique que les migrations locales pas encore marquées comme
appliquées côté distant (`supabase_migrations.schema_migrations`) — jamais
un reset complet.

## 4. Après le déploiement

1. Revérifier le schéma en lecture seule (voir méthode `SCHEMA_INVENTORY.md`) :
   confirmer que la/les nouvelle(s) table(s)/colonne(s)/policy(ies) sont bien
   présentes avec la définition attendue.
2. Vérifier les logs applicatifs / Edge Functions pendant les ~15 minutes
   suivant le déploiement (erreurs 500, `permission denied`, `column does not
   exist` seraient le signal d'un écart de schéma non anticipé).
3. Si tout est stable, clore le ticket associé en indiquant la migration
   appliquée (nom du fichier).

## 5. Rollback

### Cas réversible (la migration a un inverse simple)

Écrire et appliquer une **nouvelle migration inverse** (jamais éditer ou
supprimer une migration déjà appliquée en production — ça casserait
l'historique `schema_migrations` et la reproductibilité de COUR-9/COUR-10).
Exemples :
- `create table` → migration inverse `drop table if exists`.
- `alter table ... add column` (nullable) → migration inverse
  `alter table ... drop column if exists`.
- `grant`/policy ajoutée → migration inverse qui la retire.

### Cas non réversible (perte de données déjà actée : `drop table`, `drop
column`, `truncate`, changement de type destructif)

Il n'existe pas de rollback SQL simple — le rollback est **logique**, pas
une commande :

1. Arrêter d'écrire vers l'état cassé (feature flag / rollback du déploiement
   applicatif qui dépendait du nouveau schéma, si l'app a déjà été mise à
   jour en parallèle).
2. Restaurer les données perdues depuis le backup pré-déploiement (§2) dans
   une base de restauration séparée (jamais directement par-dessus la prod
   sans revue), puis réinjecter uniquement les lignes concernées via un
   script SQL ciblé — pas un restore complet qui écraserait les écritures
   légitimes survenues depuis.
3. Si la structure elle-même doit revenir en arrière (ex. recréer une
   colonne supprimée), écrire une nouvelle migration qui recrée l'objet,
   puis réinjecter les données restaurées à l'étape précédente.
4. Documenter l'incident (cause, données perdues le cas échéant, durée)
   dans le ticket de suivi — un rollback non réversible sans post-mortem se
   reproduit.

## 6. Responsabilités et validations

| Étape | Responsable | Validation requise |
|---|---|---|
| Écriture de la migration | Auteur de la PR | Suit `MIGRATIONS.md` (idempotence, transaction annulée) |
| Revue de la migration | Un relecteur autre que l'auteur | Relecture explicite du SQL — qualifier destructive/non destructive (§1.3) |
| CI (`supabase-migrations`, COUR-12) | Automatique | Doit être verte, aucune exception |
| Backup avant migration destructive | Auteur de la PR (ou relecteur, si l'auteur ne peut pas) | Artefact `backup.yml` vérifié non vide (§2) |
| `supabase db push` en production | Une seule personne à la fois (éviter les pushes concurrents) | PR approuvée + CI verte + backup fait si destructive |
| Vérification post-déploiement | Qui a fait le push | Schéma + logs vérifiés (§4) dans les 15 min suivant le déploiement |
| Décision de rollback | Qui a fait le push, avec l'auteur si différent | Cas réversible = migration inverse ; cas non réversible = suit §5 + post-mortem |

## 7. Environnement de validation (COUR-10) — pour répéter/simuler cette procédure

Toute cette procédure peut être simulée sans toucher à la production, sur
l'environnement local (`npx supabase start` / `db reset`, voir
`VALIDATION_ENV.md`).

### ✅ Simulée en conditions réelles (2026-07-23)

Aucun `psql`/`pg_dump` natif disponible dans l'environnement d'exécution de
l'agent — la simulation a donc été faite via `docker exec` dans le conteneur
`supabase_db_CourseoApp` (celui de la stack locale démarrée par
`supabase start`). Point d'attention Windows/Git Bash : `docker exec`/
`docker cp` avec un chemin commençant par `/tmp/...` se fait réécrire par la
conversion de chemin MSYS (`/tmp/...` → `C:\Users\...\Temp\...`) — contourné
avec `MSYS_NO_PATHCONV=1` devant la commande.

1. **Backup avant migration destructive (§2)** :
   `npx supabase db dump --local --data-only -f backup_local.dump` — génère
   un export SQL en clair (`INSERT INTO ...`), pas une archive `pg_dump
   --format=custom` malgré l'extension `.dump`. Fichier non vide vérifié
   (12 453 octets, 1 ligne `INSERT` par table peuplée).
2. **Rollback réversible (§5)** : `alter table recettes add column
   note_test_rollback text` (migration simulée) puis `alter table recettes
   drop column if exists note_test_rollback` (migration inverse) — colonne
   confirmée absente après coup. Comportement conforme à §5 "cas
   réversible".
3. **Rollback non réversible (§5)** : `delete from recettes` (perte de
   données volontaire, 5 lignes) → confirmé à 0 ligne → restauration en
   extrayant uniquement le bloc `INSERT INTO "public"."recettes" ...` du
   backup pris à l'étape 1 et en le rejouant (`psql -f`) → les 5 recettes
   d'origine sont revenues avec leurs id/titres exacts. Confirme le principe
   du §5.2 : restaurer une table ciblée depuis un backup, pas un restore
   complet par-dessus la base vivante.
4. Environnement remis à l'état propre déterministe avec `npx supabase db
   reset` (rejoue migrations + seed COUR-11) après la simulation — aucune
   trace des manipulations de test ne subsiste.

Le format réel du backup local (SQL en clair, pas une archive `pg_restore`)
est différent du `pg_dump --format=custom` utilisé par `backup.yml` en
production (§1.4) — cohérent, puisque `backup.yml` cible la prod (`pg_dump`
direct sur `DATABASE_URL`) alors que `supabase db dump --local` cible
Docker. En production, une restauration ciblée suit le même principe (§2/§5)
mais avec `pg_restore --data-only -t <table>` sur l'archive `.dump` produite
par `backup.yml`, puisque celle-ci est bien au format `--format=custom`.

C'est cette simulation, faite sur l'environnement de validation, qui sert de
vérification au sens du ticket.
