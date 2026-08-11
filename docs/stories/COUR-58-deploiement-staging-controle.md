# COUR-58 — Déploiement staging contrôlé du gateway SwissGroceries

## Story

En tant qu'équipe CoursIA, nous voulons pouvoir déployer le gateway et son Edge
Function dans un staging suisse reproductible, sans clé cloud longue durée et
sans activer les appels utilisateurs, afin de faire une recette distante dès
que la licence l'autorise.

## Critères d'acceptation

- le déploiement est exclusivement manuel ;
- une confirmation explicite de licence est obligatoire avant toute publication ;
- l'environnement GitHub `swissgroceries-staging` peut imposer un approbateur ;
- GitHub s'authentifie à Google Cloud par Workload Identity Federation ;
- l'image est publiée dans Artifact Registry avec le SHA Git, jamais `latest` ;
- le service est hébergé à Zürich (`europe-west6`) ;
- le service démarre à zéro instance, ne dépasse pas deux instances et accepte
  au maximum quatre requêtes simultanées par instance ;
- `GATEWAY_API_KEY` provient de Secret Manager et n'est jamais écrit dans le dépôt ;
- `/livez` et `/readyz` sont accessibles, mais les routes métier et `/health`
  restent protégées par le Bearer applicatif ;
- l'URL et le secret du gateway sont synchronisés vers le projet Supabase de
  staging ;
- l'Edge Function est explicitement déployée ;
- `SWISS_GROCERIES_SERVER_ENABLED=false` reste forcé après le déploiement ;
- une preuve de la révision Cloud Run est conservée comme artefact GitHub.

## Hors périmètre

- obtenir ou approuver la licence commerciale ;
- créer le projet Google Cloud, la facturation ou les identités IAM ;
- activer le coupe-circuit serveur ou le flag mobile ;
- déployer en production ;
- garantir le comportement des APIs non officielles des enseignes.

