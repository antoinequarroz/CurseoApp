# Definition of Done — CoursIA (COUR-36)

Règle commune appliquée avant de considérer un ticket terminé, formalisée à partir de la pratique déjà en place sur les ~35 premiers tickets du projet (COUR-8 à COUR-35). Rien d'inventé : chaque point ci-dessous correspond à quelque chose de réellement exigé (ou découvert manquant puis corrigé) sur au moins un ticket antérieur.

## 1. Qualité automatisée (systématique, tout ticket touchant du code)

- [ ] `npx tsc --noEmit` sans erreur.
- [ ] `npm run lint` sans erreur ni warning (`--max-warnings 0`).
- [ ] `npm test -- --coverage` vert, seuil de couverture global maintenu (`jest.config.js`, actuellement 60 % lignes). Un fichier nouvellement créé qui fait baisser la moyenne globale doit être exclu explicitement (`collectCoverageFrom`) plutôt que d'ignorer l'échec du seuil.
- [ ] CI GitHub Actions verte (`quality` **et** `supabase-migrations` si le job est déclenché) — jamais supposée verte, toujours vérifiée après le push (`gh`/API GitHub).

## 2. Migrations et impacts RLS (si le ticket touche `supabase/migrations/` ou une Edge Function)

- [ ] Migration testée par un `supabase db reset` complet (rejoue **tout** l'historique dans l'ordre chronologique, pas seulement la nouvelle migration isolée) — une migration qui ne s'applique qu'en isolation peut casser l'environnement d'un autre développeur (leçon COUR-10).
- [ ] Toute nouvelle policy RLS ou tout nouveau trigger de garde métier est prouvé avec un **vrai compte authentifié** (API Admin GoTrue, pas seulement `service_role`) qui tente l'action **sans** avoir le droit — sinon le "test" ne prouve rien (leçon COUR-35 : un trigger de garde palier payant qui n'est jamais exercé par un compte non-éligible ne prouve pas que le contournement est bloqué).
- [ ] Si le trigger/policy touche potentiellement des écritures `service_role` légitimes (seed, scripts de test, outillage support), vérifier explicitement que ces écritures ne sont pas bloquées par erreur (leçon COUR-35 : un trigger `BEFORE INSERT` s'applique à tous les rôles, contrairement à la RLS qui bypass `service_role` nativement — un oubli casse silencieusement les scripts de test existants).
- [ ] Script `scripts/verify-*.sh` dédié écrit et branché dans `.github/workflows/ci.yml` (`supabase-migrations`) pour toute nouvelle table/policy/trigger significatif — pas seulement "ça a marché en local une fois".
- [ ] Toute Edge Function modifiée : si elle change son mode d'authentification (ex. secret custom plutôt que JWT Supabase), vérifier `supabase/config.toml` (`[functions.<name>] verify_jwt`) — sinon la gateway rejette la requête *avant* le code applicatif, invisible tant que ce n'est pas testé en conditions réelles (leçon COUR-34 : bug potentiellement présent en production depuis le premier déploiement, jamais détecté faute de test).

## 3. Déploiement (si le ticket touche le schéma ou une Edge Function)

- [ ] Migration appliquée en production (`supabase migration list` pour confirmer l'état "remote", `supabase db push` si nécessaire) — **jamais supposée auto-déployée**.
- [ ] Existence réelle en production vérifiée via l'API Management Supabase (`information_schema`, `pg_policies`, `pg_trigger` — pas juste "la commande n'a pas planté").
- [ ] Edge Function modifiée : redéployée explicitement (`supabase functions deploy <nom>`) — le code d'une fonction ne se déploie **jamais** tout seul, contrairement aux migrations SQL qui semblent parfois se synchroniser automatiquement sur ce projet. Un changement de `verify_jwt` ou de logique applicative resté seulement dans le dépôt sans redéploiement explicite n'a aucun effet en production.
- [ ] Après déploiement d'une Edge Function sensible à l'authenticité (webhook, secret), un test direct contre l'URL de production (sans révéler le vrai secret) confirmant que le rejet vient bien du code applicatif et non d'une gateway mal configurée.

## 4. Modifications UI (si le ticket touche `app/` ou `components/`)

- [ ] Testé sur appareil ou simulateur réel avant de considérer le ticket terminé — golden path **et** cas limites (chargement, erreur, vide).
- [ ] Si l'environnement d'exécution ne permet pas de lancer un simulateur/appareil (ex. agent sans accès à un Mac/iPhone pour un test iOS natif ou un achat sandbox App Store), **le dire explicitement** plutôt que de prétendre le contraire — ne jamais fabriquer un résultat de test non exécuté. Fournir à la place : le code prêt à tester, un protocole de test écrit et exploitable, et la liste précise des prérequis manquants (leçon COUR-32/COUR-33).

## 5. Preuves attendues (à joindre au ticket / mentionner dans le rapport de fin de ticket)

| Type de changement | Preuve minimale |
|---|---|
| Code applicatif (hooks, composants, lib) | CI verte (lien du run), résumé des tests ajoutés/modifiés |
| Migration/RLS/trigger | Sortie du script `scripts/verify-*.sh` correspondant, confirmation de l'existence en production (requête `information_schema`/`pg_policies`) |
| Edge Function | Test direct contre l'environnement local (`supabase start` + `curl`) et, après déploiement, contre la production |
| UI | Résultat du test manuel sur appareil/simulateur, ou protocole documenté si l'exécution réelle est hors de portée de l'environnement (voir §4) |
| Décision d'architecture ou de palier d'abonnement non triviale | Entrée ADR (`docs/adr/`) ou mise à jour de `docs/entitlements/matrice-droits.md` |

## 6. Documentation

- [ ] Toute décision de conception non évidente documentée au même commit que le code (commentaire expliquant le *pourquoi*, jamais le *quoi*).
- [ ] `docs/entitlements/matrice-droits.md` mis à jour si le ticket touche un palier d'abonnement ou son application technique.
- [ ] ADR (`docs/adr/`) ajoutée ou mise à jour si le ticket introduit un choix d'architecture structurant.

## 7. Ticket pilote — application rétroactive (critère de vérification COUR-36)

DoD appliquée à **COUR-35** (« Appliquer les droits d'abonnement sur tous les parcours payants »), le ticket le plus récent touchant à la fois migration/RLS/trigger, tests et documentation :

| Point de la DoD | COUR-35 |
|---|---|
| §1 tsc/lint/tests verts | ✅ `npx tsc --noEmit`, `npm run lint`, `npm test -- --coverage` (166 tests) confirmés avant commit |
| §1 CI verte | ✅ vérifiée après push (`quality` + `supabase-migrations`) — un premier run a échoué (trigger bloquant `service_role`), corrigé et re-vérifié avant de considérer le ticket terminé |
| §2 migration testée en rejouant tout l'historique | ✅ `supabase db reset` complet avant et après le correctif |
| §2 policy/trigger prouvé avec un compte non-éligible | ✅ `scripts/verify-membres-foyer-garde-palier.sh` : compte réel au palier gratuit, tentative d'ajout rejetée (400), passage à Famille, 6 acceptés, 7e rejeté |
| §2 écritures `service_role` non cassées | ✅ trouvé en CI (régression sur `verify-foyers-membres.sh`), corrigé par une exemption explicite dans le trigger |
| §2 script branché en CI | ✅ `.github/workflows/ci.yml`, step dédié |
| §3 déploiement production | ⚠️ **bloqué** à la rédaction de ce document — historique de migrations distant désynchronisé (deux migrations appliquées hors dépôt), remédiation nécessitant une action utilisateur explicite (`supabase migration repair`) car classée sensible par le mode automatique. Documenté et communiqué plutôt que contourné. |
| §4 UI | Sans objet pour ce ticket (paywall = texte/logique, pas de nouvel écran) |
| §5 preuves | ✅ sortie des scripts de vérification citée dans le message de commit et le rapport de fin de ticket |
| §6 documentation | ✅ `docs/entitlements/matrice-droits.md` mis à jour (section audit client vs serveur) |

**Conclusion** : la DoD est exploitable telle quelle — chaque case est vérifiable objectivement (commande à exécuter, fichier à consulter), et son application au ticket pilote a mis en évidence un point qu'elle n'aurait pas dû laisser passer (le déploiement production bloqué, §3) plutôt que de le masquer.

## Intégration au modèle de ticket Jira

Cette DoD vit dans le dépôt (`docs/DEFINITION_OF_DONE.md`), pas dans Jira : cet environnement n'a pas d'accès en écriture à la configuration Jira (modèle de ticket, champs personnalisés). **Action restante hors de portée de cet agent** : coller la check-list ci-dessous dans le modèle de ticket Jira du projet COUR (Paramètres du projet → Types de ticket → Description par défaut, ou un champ dédié "Definition of Done").

Check-list courte à coller dans Jira :

```
## Definition of Done
- [ ] tsc, lint, tests verts (voir docs/DEFINITION_OF_DONE.md §1)
- [ ] Migration testée par un reset complet + script verify-*.sh si schema/RLS touché (§2)
- [ ] Deploiement production confirme (migration + Edge Function si applicable) (§3)
- [ ] Modification UI testee sur appareil/simulateur, ou limitation explicitement documentee (§4)
- [ ] Preuves jointes au ticket (§5)
- [ ] Documentation (ADR / matrice des droits) a jour si applicable (§6)
```
