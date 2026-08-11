# COUR-57 — Validation

Date : 10 août 2026

## Automatisation

- syntaxe des quatre modules Node : verte.
- gateway : 8 tests Node verts (coupe-circuit, sondes, auth, concurrence,
  erreurs client, corrélation et filtrage de `stderr`).
- `npm ci --ignore-scripts` : 176 paquets installés depuis le lockfile dédié,
  audit npm à 0 vulnérabilité connue.
- dépendances transitives : avertissements de dépréciation sur `inflight`,
  `glob@8` et `whatwg-encoding`, hérités du MCP ; à réévaluer lors de chaque
  montée de version autorisée.
- image Docker construite avec succès : digest local
  `sha256:df998441cb238065a777527088e79936c8b145ccb5f9f56673a368834ffc2c5b`.
- `npm run type-check` et `npm run lint` : verts.
- Jest CoursIA : 43 suites, 257 tests verts, couverture globale 87,15 % des
  lignes.

## Sécurité et exploitation

- conteneur exécuté sous l'utilisateur non-root `node` ; état Docker `healthy`.
- `/livez` et `/readyz` : HTTP 200 ; route métier sans Bearer : HTTP 401.
- plan réel `lait + pommes`, NPA 1003 : CHF 14, deux articles trouvés.
- logs du plan : `requestId` présent, aucun nom de produit ni contenu de liste.
- kill switch Edge désactivé, gateway absent : compte Standard rejeté HTTP 503
  avant tout appel gateway.
- kill switch activé : compte Standard HTTP 200 ; le même compte repassé au
  palier Gratuit HTTP 403.
- `supabase db reset` isolé : 49 migrations rejouées et seed appliqué.
- stack Supabase et conteneurs de test arrêtés après validation.

## Limites explicites

- aucun déploiement distant : licence commerciale et hébergeur non validés ;
- CI GitHub non vérifiée : aucun push n'a été demandé dans ce ticket ;
- aucune modification UI, donc aucun test appareil requis pour ce ticket.
