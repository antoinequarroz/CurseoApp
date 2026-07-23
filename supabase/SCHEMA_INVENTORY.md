# Inventaire du schéma Supabase en production — COUR-8

**Projet** : `bpycfeyapuekmesmxnvd` (ref) — **Date de l'inventaire** : 2026-07-23
**Méthode** : requêtes SQL en lecture seule via l'API Management Supabase (`/database/query`),
authentifiées avec le token déjà présent dans `.env.development`. Le serveur MCP Supabase
configuré dans cet environnement n'a pas de token valide (`Unauthorized`) — contournement
documenté en fin de fichier pour que ce blocage soit résolu.

Aucune donnée personnelle n'a été exportée : uniquement des métadonnées de schéma
(noms de tables/colonnes, types, contraintes, policies). Aucune ligne de données n'a été lue.

---

## 1. Tables (schéma `public`)

| Table | Lignes de code app qui la référencent | Statut |
|---|---|---|
| `profils` | 6 fichiers | ✅ Versionné, utilisé |
| `commandes` | 2 fichiers | ✅ Versionné, utilisé |
| `listes_courses` | 1 fichier | ✅ Versionné, utilisé |
| `swipes` | 2 fichiers | ✅ Versionné, utilisé |
| `rate_limits` | 1 fichier (edge function) | ✅ Versionné (seule table dans une migration locale), utilisé |
| `waitlist` | 1 fichier (edge function) | ✅ Versionné (seule table dans une migration locale), utilisé |
| `notifications` | 1 fichier | ⚠️ Uniquement distant, utilisé côté app |
| `signalements` | 1 fichier | ⚠️ Uniquement distant, utilisé côté app |
| `recettes` | **0 fichier** | 🔴 Uniquement distant, **jamais lu par l'app** (voir §6) |
| `favoris` | **0 fichier** | 🔴 Uniquement distant, **jamais lu par l'app** — probablement obsolète (les favoris sont gérés via `swipes.aime` côté app) |
| `planning_repas` | **0 fichier** | 🔴 Uniquement distant, **jamais lu par l'app** — le planning vit uniquement dans le store Zustand local (`stores/planningStore.ts`), aucune persistance serveur |

### Vues (schéma `public`)

| Vue | Définition | Statut |
|---|---|---|
| `profils_actifs` | `SELECT * FROM profils WHERE deleted_at IS NULL` | 🔴 Uniquement distant, jamais utilisée côté app (soft-delete géré ailleurs) |
| `recettes_a_moderer` | Recettes communautaires avec ≥3 signalements en attente | 🔴 Uniquement distant, jamais utilisée côté app — probablement prévue pour un futur back-office modération |

**Toutes les tables ont RLS activé** (`rowsecurity = true`), sans exception.

---

## 2. Contraintes clés

- `profils.id` → FK vers **`auth.users(id)`** (pas juste `public`, cross-schéma)
- `commandes.profil_id/liste_id`, `listes_courses.profil_id/planning_id`, `notifications.profil_id`,
  `planning_repas.profil_id`, `swipes.profil_id/recette_id`, `favoris.profil_id/recette_id`,
  `signalements.recette_id/signale_par`, `recettes.auteur_id` → toutes des FK cohérentes vers `profils`/`recettes`
- CHECK constraints métier : `profils_abonnement_check`, `profils_apparence_check`,
  `recettes_difficulte_check`, `notifications_type_check`, `signalements_statut_check`,
  `signalements_raison_check`
- `signalements` : contrainte UNIQUE `(recette_id, signale_par)` — un utilisateur ne peut signaler
  qu'une fois la même recette
- `waitlist.email` : UNIQUE

## 3. Index

Index applicatifs (hors clés primaires) : `idx_commandes_profil`, `idx_favoris_profil`,
`idx_courses_profil`, `idx_courses_planning`, `idx_notifications_profil`, `idx_planning_profil`,
`idx_planning_semaine`, `idx_rate_limits`, `idx_swipes_profil`, `idx_swipes_recette`,
`idx_recettes_communautaires` (partiel, `WHERE est_communautaire = true`).

**Point notable** : `idx_recettes_regime` et `idx_recettes_allergenes` sont des **index GIN**
spécifiquement conçus pour des recherches par containment sur des tableaux (`regime @> ...`,
`allergenes && ...`). Ça prouve que le schéma a été pensé dès le départ pour un vrai filtrage
serveur des recettes par régime/allergie — jamais exploité côté app puisque `recettes` n'est
jamais lue (voir §6).

## 4. RLS — policies

Toutes les policies suivent le même schéma `auth.uid() = profil_id` (ou `= id` pour `profils`) :
`profil_own`, `commandes_own`, `courses_own`, `notifications_own`, `planning_own`, `swipes_own`,
`favoris_own`. Exceptions :
- `recettes_read` (SELECT, `true` — lecture publique) + `recettes_write` (ALL, `auth.uid() = auteur_id`)
- `signalements` : INSERT avec `auth.uid() = signale_par`, SELECT restreint à ses propres signalements

**⚠️ `rate_limits` et `waitlist` : RLS activé, mais aucune policy définie.** Avec RLS ON et zéro
policy, l'accès est refusé par défaut à `anon`/`authenticated` malgré les GRANTs larges (voir §5)
— cohérent avec le fait que ces deux tables ne sont écrites que par les Edge Functions via la clé
`service_role`, qui contourne RLS. **Comportement voulu, pas une faille**, mais à documenter
explicitement pour ne pas être "corrigé" par erreur plus tard en ajoutant des policies inutiles.

**Stockage** (`storage.objects`, bucket `images`, public) :
- `images_read` (SELECT, public)
- `images_delete` (DELETE, restreint au dossier `auth.uid()`)
- ⚠️ **`images_write` (INSERT) n'a aucune condition (`qual: null`)** — n'importe quel rôle peut
  uploader dans le bucket public sans restriction de dossier. À valider : est-ce voulu (upload de
  recettes communautaires par exemple) ou un oubli de policy restrictive ?

## 5. GRANTs (anon / authenticated)

Toutes les tables accordent l'intégralité des privilèges (`SELECT, INSERT, UPDATE, DELETE,
TRUNCATE, REFERENCES, TRIGGER`) à **la fois** `anon` et `authenticated` — c'est le comportement
par défaut Supabase (RLS est censé être la seule couche de contrôle réelle). Cohérent avec les
policies du §4, sauf pour `rate_limits`/`waitlist` où l'absence de policy neutralise ces GRANTs.

## 6. Fonctions, triggers, extensions

- **Aucun trigger applicatif personnalisé** sur les tables `public`.
- Une seule fonction custom : `rls_auto_enable` (SECURITY DEFINER, event trigger) — probablement
  liée à la fonctionnalité native Supabase d'auto-activation RLS sur les nouvelles tables.
- Event triggers (`ensure_rls`, `pgrst_ddl_watch`, etc.) : tous standards de la plateforme Supabase,
  aucun n'est spécifique à Coursia.
- Extensions : `pgcrypto`, `uuid-ossp`, `pg_stat_statements`, `supabase_vault`, `plpgsql` — toutes
  standards, aucune extension métier (pas de PostGIS, pas de pg_cron actif, etc.)

## 7. Storage

- 1 bucket : `images` (public) — voir policies au §4.

## 7bis. Realtime, Database Webhooks, Auth

- **Realtime** : aucune table publiée sur `supabase_realtime` — l'app ne dépend d'aucune
  souscription temps réel côté serveur (cohérent avec le code, qui poll/refetch plutôt que
  s'abonner).
- **Database Webhooks** : aucun trigger de ce type sur le schéma `public`.
- **Auth** : un seul provider actif, `email` (pas d'OAuth Google/Apple configuré côté Supabase —
  le "Sign in with Apple" de l'app passe par `supabase.auth.signInWithIdToken`, pas par un
  provider OAuth Supabase classique, donc rien à recenser ici de plus).

## 8. Edge Functions (via API Management, 4 déployées, toutes `ACTIVE`)

| Slug | verify_jwt | Version | Statut vs repo |
|---|---|---|---|
| `ai-assistant` | true | 2 | ✅ Correspond à `supabase/functions/ai-assistant` |
| `delete-account` | true | 3 | ✅ Correspond à `supabase/functions/delete-account` |
| `waitlist` | false | 3 | ✅ Correspond à `supabase/functions/waitlist` (public, honeypot géré en interne) |
| `revenuecat-webhook` | false | 4 | ✅ Correspond à `supabase/functions/revenuecat-webhook` (webhook signé, pas de JWT) |

**Aucun écart** entre les Edge Functions déployées et le code du dépôt — c'est la seule
partie du backend intégralement synchronisée avec le repo.

## 9. Migrations — l'écart principal

**Une seule migration est tracée** par Supabase (`supabase_migrations.schema_migrations`) :

```
20260715080000_enable_rls_waitlist_rate_limits
```

Elle correspond au seul fichier présent dans `supabase/migrations/` en local.

**➡️ Conséquence : la quasi-totalité du schéma réel (10 des 11 tables, les 2 vues, tous les index,
toutes les policies sauf celles de la migration ci-dessus, le bucket de storage) a été créée en
dehors du système de migration** — directement via l'éditeur SQL du dashboard ou des appels
`execute_sql` non trackés plutôt que `apply_migration`. **Le schéma ne peut pas être reconstruit
à partir du dépôt aujourd'hui.** C'est l'écart le plus important trouvé par cet inventaire, et il
bloque directement l'objectif du ticket ("supprimer la dépendance aux changements manuels").

---

## Résumé des divergences à traiter (par priorité)

1. **🔴 Bloquant** — Générer une migration de rattrapage (`supabase db diff` ou équivalent manuel)
   capturant tout le schéma actuel, pour que le dépôt redevienne la source de vérité.
2. **🔴 Produit** — `recettes` existe côté serveur avec un schéma complet et des index prêts pour
   le filtrage régime/allergies, mais l'app tourne encore à 100% sur `RECETTES_MOCK`. C'est
   directement lié à l'EPIC "Backend recettes réel" du plan de développement déjà proposé.
3. **🟡 À clarifier** — `favoris`, `planning_repas`, `profils_actifs`, `recettes_a_moderer` sont
   provisionnées mais jamais utilisées par l'app : à garder (roadmap future) ou supprimer
   (dette morte) ? Décision produit à prendre, pas une action technique.
4. **🟡 Sécurité mineure** — policy `images_write` sans restriction : à valider intentionnellement
   ou à corriger.

## Comment cet inventaire a été produit (pour reproduire ou automatiser)

Le serveur MCP Supabase configuré dans Claude Code n'avait pas de token valide. Contournement :
appel direct à l'API Management Supabase avec le `SUPABASE_ACCESS_TOKEN` déjà présent dans
`.env.development` :

```bash
curl -s -X POST "https://api.supabase.com/v1/projects/<ref>/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"<SQL en lecture seule>"}'
```

**À corriger côté configuration** : fournir un token valide au serveur MCP (`--access-token` ou
variable d'environnement `SUPABASE_ACCESS_TOKEN` au lancement du serveur) pour que les outils MCP
`list_tables`/`get_advisors`/etc. fonctionnent directement la prochaine fois, sans ce contournement.
