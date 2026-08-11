# Runbook — prix live de demonstration TestFlight

## Statut

La build 19 contient la capacite de demander l'eligibilite SwissGroceries, mais
le serveur reste l'unique autorite. La demonstration actuelle n'est ni une
infrastructure de production, ni une garantie de disponibilite ou d'exactitude
des prix.

Le mode autorise est `canary` avec une cohorte explicite de comptes Standard+.
Un utilisateur absent de la cohorte, une erreur reseau ou une reponse invalide
doit retrouver silencieusement l'experience de simulation.

## Controles avant une session

1. verifier que le gateway local et le tunnel HTTPS sont actifs ;
2. verifier que `GET /readyz` repond 200 ;
3. verifier que `/health` et `/v1/*` refusent une requete sans Bearer ;
4. verifier dans Supabase que le mode est `canary`, jamais `on` ;
5. verifier que la cohorte contient uniquement les UUID convenus ;
6. effectuer une recherche synthetique sans information personnelle ;
7. rappeler au testeur que les prix sont experimentaux.

## Arret immediat

La premiere action consiste a positionner les secrets Supabase
`SWISS_GROCERIES_SERVER_ENABLED=false` et
`SWISS_GROCERIES_SERVER_MODE=off`. L'Edge Function ferme alors l'acces meme si
le binaire, le tunnel ou le gateway restent actifs. Arreter ensuite le tunnel
et le gateway local.

## Passage a une infrastructure durable

Le depot prepare Cloud Run a Zurich, Artifact Registry, Secret Manager, OIDC
GitHub et un projet Supabase de staging distinct. Leur creation reste bloquee
jusqu'a l'obtention d'un accord de licence ecrit et a la validation des couts.
Le tunnel rapide ne doit jamais etre reutilise comme endpoint de production.

La procedure detaillee de deploiement, de monitoring, de canary et de rollback
se trouve dans `docs/runbooks/swissgroceries-gateway-staging.md`.
