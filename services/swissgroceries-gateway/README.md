# SwissGroceries gateway

Passerelle privee entre l'Edge Function CoursIA et le serveur MCP
`@nicktcode/swissgroceries-mcp`. Elle ne doit jamais etre appelee directement
par l'application mobile ni exposee sans `GATEWAY_API_KEY`.

## Lancer localement

```powershell
$env:GATEWAY_API_KEY = '<secret-local-aleatoire-de-32-caracteres>'
npm ci
npm start
```

Par defaut, le processus lance la version `0.9.0`. Pour utiliser un binaire ou
une image autorisee explicitement :

```powershell
$env:SWISSGROCERIES_MCP_COMMAND = 'C:\Program Files\nodejs\node.exe'
$env:SWISSGROCERIES_MCP_ARGS = '["C:/chemin/vers/dist/index.js"]'
```

Avant toute mise en production, obtenir/valider la licence commerciale de la
version maintenue. Les endpoints enseignes sont non officiels : conserver un
timeout, un circuit de repli et ne jamais annoncer un prix comme garanti.

## Contrats d'exploitation

- `GET /livez` : liveness publique, sans appel aux enseignes ;
- `GET /readyz` : readiness publique minimale, HTTP 503 si le MCP ou le
  coupe-circuit n'est pas prêt ;
- `GET /health` : diagnostic MCP protégé par `GATEWAY_API_KEY` ;
- routes `/v1/*` : Bearer obligatoire, quatre appels MCP simultanés par défaut ;
- trois pannes consécutives ouvrent le circuit pendant 30 secondes ;
- les logs JSON contiennent l'identifiant de requête, la route, le statut et la
  durée, jamais le produit recherché ni le contenu de la liste.

Variables de production :

| Variable | Obligatoire | Valeur attendue |
|---|---:|---|
| `GATEWAY_API_KEY` | oui | secret aléatoire de 32 caractères ou plus |
| `PORT` | non | `8787` |
| `HOST` | non | `0.0.0.0` |
| `MAX_IN_FLIGHT` | non | `4`, maximum accepté `20` |
| `SWISSGROCERIES_MCP_COMMAND` | non | binaire Node par défaut |
| `SWISSGROCERIES_MCP_ARGS` | non | tableau JSON, uniquement pour un binaire autorisé |

## Image locale

```powershell
docker build --tag coursia-swissgroceries-gateway:local .
docker run --rm -p 8787:8787 `
  -e GATEWAY_API_KEY='<secret-de-32-caracteres>' `
  coursia-swissgroceries-gateway:local
```

Cette image ne doit pas être poussée vers un registre ni déployée sans accord
de licence explicite. Le `HEALTHCHECK` Docker utilise `/readyz`.
