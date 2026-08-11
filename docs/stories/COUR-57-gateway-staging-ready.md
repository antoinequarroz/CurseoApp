# COUR-57 — Gateway SwissGroceries prêt pour le staging

## Story

En tant qu'équipe CoursIA, nous voulons un gateway reproductible, observable et
capable de contenir une panne d'enseigne afin de pouvoir l'héberger en staging
après validation de la licence, sans exposer les listes de courses.

## Critères d'acceptation

- la dépendance MCP est verrouillée à une version exacte dans un lockfile dédié ;
- l'image utilise une version Node compatible, un utilisateur non-root et un
  health check de readiness ;
- liveness et readiness n'exposent aucune donnée métier ;
- les routes métier exigent un secret d'au moins 24 caractères ;
- les arguments MCP ne viennent jamais de la requête pour choisir une commande
  ou un exécutable ;
- trois échecs MCP consécutifs ouvrent le circuit pendant 30 secondes ;
- le nombre d'appels simultanés est borné et un client reçoit `Retry-After`
  lorsque le service est occupé ou le circuit ouvert ;
- les logs sont structurés et corrélés par `X-Request-Id`, sans produit,
  préférence alimentaire ni contenu de liste ;
- l'Edge Function transmet un identifiant de corrélation et possède un
  coupe-circuit serveur désactivé par défaut, modifiable sans nouvelle build ;
- les erreurs JSON et de taille de payload retournent un statut client, pas une
  fausse panne enseigne ;
- la CI teste le gateway et construit l'image sans la publier ;
- aucun registre, staging ou secret distant n'est créé avant accord de licence.

## Hors périmètre

- choix contractuel d'un hébergeur ;
- push de l'image dans un registre ;
- déploiement staging/production et rotation d'un vrai secret ;
- activation du feature flag mobile.
