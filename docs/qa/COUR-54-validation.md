# COUR-54 — Validation

Date : 10 août 2026

## Automatisation

- `npm run type-check` : vert.
- `npm run lint` : vert, 0 warning.
- Jest couverture : 42 suites, 248 tests, tous verts ; couverture globale
  86,51 % des lignes (seuil 60 %) ; `swissGroceriesRepository.ts` 100 % lignes.
- `node --check services/swissgroceries-gateway/server.mjs` : vert.

## Supabase et MCP local

- `supabase db reset` complet dans une stack isolee : 44 migrations rejouees et
  seed applique avec succes.
- gateway `0.9.0` : appel reel `health_check`, 7 enseignes saines sur 8 au
  moment du test ; Farmy indisponible sans bloquer les autres enseignes.
- appel reel `search_products("lait")` : un resultat Migros et un resultat Coop.
- parcours complet avec un vrai compte Supabase Standard : mobile/backend DTO ->
  Edge Function -> gateway -> MCP, resultat Migros + Coop.
- meme compte passe au palier gratuit : HTTP 403 confirme par l'Edge Function.

## Limites explicites de la validation

- pas de test tactile sur iPhone/simulateur dans ce tour : le swipe est pret
  pour recette TestFlight, mais son ressenti doit etre valide sur l'appareil ;
- Edge Function et gateway non deployes en production : absence volontaire de
  licence commerciale validee, d'URL gateway privee et de secrets production ;
- `SWISS_GROCERIES_ENABLED` reste `false` par defaut ; aucune build existante
  n'affiche donc les donnees live.
