# Runbook — SwissGroceries gateway en staging

## Cible retenue

Le staging est prévu sur Google Cloud Run à Zürich (`europe-west6`). Le service
est publiquement joignable en HTTPS car l'Edge Function Supabase n'appartient
pas au réseau Google Cloud. Cette ouverture ne donne pas accès aux données :
seuls `/livez` et `/readyz` sont publics ; `/health` et les routes métier exigent
le Bearer applicatif. Le rate limiting utilisateur reste appliqué dans l'Edge
Function.

## Préconditions bloquantes

Ne pas pousser l'image vers un registre et ne pas créer de service distant
avant d'avoir :

1. un accord de licence commercial ou juridique écrit pour la version MCP ;
2. un hébergeur et une région approuvés ;
3. un gestionnaire de secrets ;
4. un projet Google Cloud avec facturation et APIs Cloud Run, Artifact Registry,
   Secret Manager et IAM Credentials activées ;
5. un projet Supabase de staging distinct de la production.

## Ressources à créer une seule fois

- dépôt Artifact Registry Docker `coursia-containers` dans `europe-west6` ;
- secret Secret Manager `coursia-swissgroceries-gateway-api-key`, valeur
  aléatoire d'au moins 32 caractères ;
- compte d'exécution Cloud Run `coursia-swissgroceries-staging`, autorisé
  uniquement à lire ce secret ;
- compte de déploiement fédéré depuis GitHub, limité au dépôt Artifact Registry,
  au service Cloud Run et à l'utilisation du compte d'exécution ;
- GitHub Environment `swissgroceries-staging`, idéalement avec approbateur.
- GitHub Environment `swissgroceries-staging-ops`, sans approbation interactive
  afin que les sondes planifiées puissent s'exécuter, mais sans identité de
  déploiement Google Cloud.

Variables de cet Environment :

- `GCP_PROJECT_ID` ;
- `SUPABASE_PROJECT_REF`.

Secrets de cet Environment :

- `GCP_WORKLOAD_IDENTITY_PROVIDER` ;
- `GCP_DEPLOY_SERVICE_ACCOUNT` ;
- `SUPABASE_ACCESS_TOKEN`.

Créer au niveau du dépôt la variable
`SWISS_GROCERIES_MONITORING_ENABLED=false`. Elle est évaluée avant le démarrage
du job et évite de consommer un runner tant que le staging n'est pas activé.

L'Environment `swissgroceries-staging-ops` contient uniquement :

- `SWISS_GROCERIES_GATEWAY_URL`, URL `https://…run.app` obtenue après le
  premier déploiement ;
- `SUPABASE_PROJECT_REF` ;
- `SUPABASE_ACCESS_TOKEN`, idéalement limité au projet de staging.

Le workflow ne requiert aucune clé JSON Google Cloud persistante.

## Déploiement automatisé

Dans GitHub Actions, lancer **Deploy SwissGroceries staging**, cocher
`license_approved` uniquement si l'accord écrit est disponible, puis faire
approuver l'Environment. Le workflow publie l'image taguée au SHA, déploie le
gateway, vérifie les probes, synchronise les secrets Supabase et redéploie
explicitement l'Edge Function. Il laisse toujours
`SWISS_GROCERIES_SERVER_ENABLED=false` et
`SWISS_GROCERIES_SERVER_MODE=off`.

## Surveillance et arrêt d'urgence

Après une recette distante réussie, définir la variable de dépôt
`SWISS_GROCERIES_MONITORING_ENABLED=true`. Le workflow
**Monitor SwissGroceries staging**
sonde `/readyz` toutes les cinq minutes. Il effectue quatre tentatives pour
absorber les démarrages à froid. Si elles échouent toutes, il applique
immédiatement `SWISS_GROCERIES_SERVER_ENABLED=false` et
`SWISS_GROCERIES_SERVER_MODE=off` dans Supabase puis termine
en erreur afin de rendre l'incident visible.

Les planifications GitHub Actions sont une surveillance de prototype et peuvent
être retardées. Cloud Monitoring fournit déjà les métriques Cloud Run natives ;
une alerte temps réel et un canal d'astreinte seront requis avant la production.

Pour un arrêt humain immédiat, lancer **Disable SwissGroceries staging** et
saisir exactement `DESACTIVER`. Modifier un secret Supabase ne nécessite pas de
redéployer l'Edge Function ; le nouveau coupe-circuit est disponible
immédiatement.

Le gateway écrit `circuit_state_changed` uniquement avec les états précédent et
suivant. Ce log peut servir à une métrique Cloud Logging sans exposer les
produits ou les listes.

## Canary qualité avant activation

Lancer manuellement **Canary SwissGroceries staging** et confirmer la licence.
Le runner utilise cinq recherches synthétiques et seulement Migros/Coop. Son
artefact `canary-summary.json` ne contient ni nom, ni réponse brute, ni prix :
uniquement les taux de succès, couverture, validité, comparabilité et la
latence p95.

Le canary technique doit être vert, mais il ne suffit pas. Relever le même jour
au moins dix prix réellement observés sur les deux enseignes, puis créer hors du
dépôt un fichier JSON de cette forme :

```json
[
  {
    "productReference": "reference-interne-libre",
    "livePriceChf": 4.2,
    "observedPriceChf": 4.1,
    "observedAt": "2026-08-10T12:00:00+02:00"
  }
]
```

Évaluer ce fichier sans publier son contenu :

```bash
npm --prefix services/swissgroceries-gateway run benchmark -- <observations.json>
```

Le rapport agrégé doit avoir `passed=true` : dix échantillons de moins de 24 h,
écart absolu médian au plus égal à 5 % et p90 au plus égal à 10 %. Supprimer le
fichier brut après validation ou le conserver dans un espace métier protégé,
jamais dans Git ni dans un artefact CI.

Une activation canary utilisateur n'est autorisée que si le canary technique
et le benchmark terrain sont verts. COUR-60 ne réalise volontairement aucune
activation.

## Construction

```bash
docker build --pull --tag coursia-swissgroceries-gateway:<commit> services/swissgroceries-gateway
docker inspect coursia-swissgroceries-gateway:<commit>
```

Conserver le digest produit par le registre. Ne jamais utiliser `latest` dans
la configuration du service.

## Secrets et variables

- générer `GATEWAY_API_KEY` avec au moins 32 caractères aléatoires ;
- stocker la même valeur dans le gestionnaire de secrets de l'hébergeur et
  dans `SWISS_GROCERIES_GATEWAY_API_KEY` des secrets Supabase ;
- définir `SWISS_GROCERIES_GATEWAY_URL` sur l'URL HTTPS du service ;
- conserver `SWISS_GROCERIES_SERVER_ENABLED=false` et
  `SWISS_GROCERIES_SERVER_MODE=off` pendant le smoke test ;
- démarrer avec `MAX_IN_FLIGHT=4` et une seule instance, puis mesurer avant de
  modifier la concurrence.

## Probes et smoke test

1. `GET /livez` retourne 200 sans authentification ;
2. `GET /readyz` retourne 200 lorsque le MCP est initialisé ;
3. `GET /health` sans Bearer retourne 401 ;
4. `GET /health` avec le secret retourne 200 ;
5. une recherche synthétique retourne un résultat sans apparaître dans les
   logs ;
6. trois pannes simulées ouvrent le circuit et la suivante retourne 503 avec
   `Retry-After`.

## Activation contrôlée

Ajouter au GitHub Environment `swissgroceries-staging` le secret
`SWISS_GROCERIES_CANARY_USER_IDS`, contenant de un à dix UUID Supabase Auth
séparés par des virgules. Ne jamais placer ces identifiants dans un input de
workflow, un artefact ou le bundle mobile.

Lancer **Activate SwissGroceries canary** uniquement après avoir validé la
licence, le canary technique et le benchmark terrain, puis saisir exactement
`ACTIVER CANARY`. Le workflow vérifie la cohorte sans l'afficher, enregistre
d'abord `SERVER_MODE=off`, déploie explicitement l'Edge Function, puis passe à
`SERVER_MODE=canary`. Il conserve toujours
`SWISS_GROCERIES_SERVER_ENABLED=false` : une ancienne révision restaurée ne peut
donc pas ouvrir accidentellement le service à tous les abonnés.

Tester un compte Standard+ de la cohorte, un compte Standard+ hors cohorte
attendu en 503 et un compte Gratuit de la cohorte attendu en 403. Le flag Expo
doit être actif dans le binaire de recette afin d'autoriser uniquement la
demande d'éligibilité COUR-62 ; il ne remplace aucune garde serveur. Le mode
général `on` n'est pas autorisé par ce workflow.

## Alertes minimales

- readiness en échec pendant deux minutes ;
- redémarrage du conteneur ;
- taux de réponses 5xx supérieur à 5 % sur cinq minutes ;
- latence p95 supérieure à 10 secondes ;
- présence répétée de `circuit: "open"` dans les logs.

Les logs autorisés sont `requestId`, méthode, route, statut, durée et état du
circuit. Ne jamais ajouter le corps HTTP, les arguments MCP ou les messages
d'erreur upstream.

## Arrêt et rollback

1. lancer **Disable SwissGroceries staging**, ou définir immédiatement
   `SWISS_GROCERIES_SERVER_ENABLED=false` et
   `SWISS_GROCERIES_SERVER_MODE=off` dans les secrets Supabase ;
2. vérifier que l'Edge Function retourne 503 sans appeler le gateway ;
3. remettre le digest de l'image précédente si le gateway est en cause ;
4. tourner les deux copies du secret en cas de doute sur leur exposition ;
5. le binaire peut conserver sa capacité d'éligibilité active : le mode serveur
   `off` suffit à masquer l'UI au prochain rafraîchissement et bloque
   immédiatement tous les appels métier.
