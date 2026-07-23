# Procédure — créer une nouvelle migration Supabase (COUR-9)

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

## Rattrapage effectué par ce ticket

Le schéma de production existait déjà en intégralité (voir
`SCHEMA_INVENTORY.md`, COUR-8) mais une seule migration était versionnée.
Les fichiers `20260723150000` à `20260723150500` recréent fidèlement l'état
actuel (tables, vues, index, RLS, policies, grants, storage) de façon
idempotente. Ils ont été **vérifiés par transaction annulée** (`begin` /
`rollback`) contre la prod ET contre un schéma vide — voir le détail dans le
message de commit — mais **jamais réellement exécutés contre la prod**.

**Étape restante, à faire consciemment (pas automatisée par ce ticket)** :
marquer ces migrations comme déjà appliquées côté distant, sans les
ré-exécuter (puisque les objets existent déjà) :

```bash
npx supabase migration repair --status applied 20260723150000 20260723150100 \
  20260723150200 20260723150300 20260723150400 20260723150500
```

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
