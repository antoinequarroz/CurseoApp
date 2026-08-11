# COUR-59 — Rapport de validation

## Portée livrée

- événements `circuit_state_changed` sur les transitions réelles du circuit ;
- callback de télémétrie isolé du comportement de résilience ;
- monitoring GitHub Actions toutes les cinq minutes, inactif par défaut ;
- quatre probes de readiness avant rollback ;
- fermeture automatique du coupe-circuit Supabase ;
- arrêt d'urgence manuel avec confirmation explicite ;
- tests statiques empêchant les workflows d'activer le service.

## Validation locale

- `npm ci --prefix services/swissgroceries-gateway --ignore-scripts` : lockfile
  reproductible, 177 paquets audités, 0 vulnérabilité ;
- `npm run test:gateway` : 14/14 tests verts ;
- `npx --yes yaml-lint` sur les trois workflows SwissGroceries : vert ;
- `rhysd/actionlint` sur les trois workflows : vert ;
- `npm run type-check` : vert ;
- `npm run lint` : vert, aucun warning ;
- `npm test -- --coverage --runInBand` : 43 suites, 257 tests, tous verts ;
- image Docker 0.3.0 construite, digest local
  `sha256:0556316972443759b513ce1ddff6f3b9a38ec6aa7a7659e627626b41de562147` ;
- smoke test conteneur : `/livez` annonce 0.3.0, `/readyz` est prêt,
  `/health` authentifié répond et le processus s'exécute avec l'utilisateur
  non-root `node` ;
- recherche de motifs de secrets et `git diff --check` : verts.

La suite Jest conserve les avertissements historiques `act(...)` et force un
worker à quitter après les tests. Elle termine néanmoins avec le code 0 et les
257 tests verts ; COUR-59 n'ajoute aucun test React concerné par ces warnings.

## Limites explicites

Les workflows ne sont pas déclenchés tant que le staging n'existe pas et que la
licence n'est pas validée. Leur exécution distante et la propagation effective
du secret Supabase restent donc à vérifier après le premier déploiement autorisé.

Aucune migration, policy RLS ou modification d'Edge Function n'est introduite
par COUR-59. Un `supabase db reset` n'est donc pas requis pour ce ticket.
