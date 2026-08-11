# COUR-55 — Validation

Date : 10 août 2026

## Automatisation

- `npm run type-check` : vert.
- `npm run lint` : vert, 0 warning.
- Jest couverture : 43 suites, 253 tests, tous verts ; couverture globale
  87,15 % des lignes (seuil 60 %).
- `node --check services/swissgroceries-gateway/server.mjs` : vert.

## Supabase et parcours réel

- `supabase db reset` complet dans une stack isolée : 49 migrations rejouées et
  seed appliqué avec succès ;
- appel réel `plan_shopping` sur `lait` et `pommes`, NPA 1003, Migros + Coop ;
- parcours Gateway -> MCP -> Edge Function avec un vrai compte Supabase
  Standard : HTTP 200, total CHF 14, un arrêt, deux articles trouvés et aucun
  article non trouvé ;
- le même compte repassé au palier gratuit : HTTP 403 confirmé ;
- feature flag maintenu à `false` sans licence commerciale et gateway de
  production.

## Limites explicites

- le ressenti et les états visuels doivent encore être validés sur iPhone via
  une future build TestFlight ;
- aucun déploiement de l'Edge Function ne doit précéder le déploiement du
  gateway privé et la validation de licence.
