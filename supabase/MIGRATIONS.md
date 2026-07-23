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
