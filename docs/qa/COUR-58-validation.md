# COUR-58 — Rapport de validation

## Portée livrée

- workflow manuel `.github/workflows/deploy-swissgroceries-staging.yml` ;
- garde de licence indépendante du job de déploiement ;
- authentification Google Cloud OIDC/WIF ;
- publication immuable dans Artifact Registry ;
- déploiement borné sur Cloud Run Zürich ;
- injection du secret depuis Secret Manager ;
- probes publiques minimales et vérification authentifiée de `/health` ;
- synchronisation des secrets vers Supabase avec coupe-circuit fermé ;
- déploiement explicite de l'Edge Function ;
- tests statiques des invariants sensibles dans la suite du gateway.

## Validation locale

- `npm run test:gateway` : 11/11 tests verts, dont les trois invariants de
  déploiement ajoutés par COUR-58 ;
- `npm run type-check` : vert ;
- `npm run lint` : vert, aucun warning ;
- `npm test -- --coverage --runInBand` : 43 suites, 257 tests, tous verts ;
- `npx --yes yaml-lint .github/workflows/deploy-swissgroceries-staging.yml` :
  syntaxe YAML valide ;
- `rhysd/actionlint` (image digest
  `sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667`) :
  workflow GitHub Actions valide ;
- `docker build --pull --tag coursia-swissgroceries-gateway:cour-58
  services/swissgroceries-gateway` : image construite, digest local
  `sha256:aac73be90762a3265ac82b48052f1e3a9395842fe721c93901657ff516886206`,
  audit npm à 0 vulnérabilité ;
- recherche locale de motifs de clés privées et tokens connus : aucun secret
  trouvé dans les fichiers COUR-58.

La suite Jest conserve des avertissements historiques `act(...)` et un worker
forcé à quitter, mais termine avec le code 0 et tous les tests verts. Aucun de
ces avertissements ne provient des fichiers de déploiement ajoutés ici.

## Limites explicites

Le workflow n'a pas été déclenché : publier l'image AGPL et créer le service
distant reste interdit tant qu'un accord de licence écrit n'est pas disponible.
Les variables GitHub Environment et les ressources Google Cloud décrites dans
le runbook doivent également être créées par un administrateur du compte.

En conséquence, la CI distante, la révision Cloud Run et le déploiement de
l'Edge Function de staging ne peuvent pas être déclarés vérifiés. Le ticket
livre une chaîne prête et testable, pas un faux résultat de déploiement.
