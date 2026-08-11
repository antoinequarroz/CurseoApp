# COUR-56 — Validation

Date : 10 août 2026

## Automatisation

- `npm run type-check` : vert.
- `npm run lint` : vert, 0 warning.
- Jest couverture : 43 suites, 257 tests, tous verts ; couverture globale
  87,15 % des lignes (seuil 60 %).
- 23 tests ciblés verts : repository, hook prix, composant d'optimisation et
  horodatage Europe/Zurich.
- `git diff --check` et vérification syntaxique du gateway : verts.

## Supabase et parcours réel

- `supabase db reset` complet dans une stack isolée : 49 migrations rejouées
  et seed appliqué avec succès.
- compte Supabase Standard réel : HTTP 200, source `SwissGroceries`,
  `collectedAt` fixé par l'Edge Function, total CHF 14 et deux articles trouvés.
- même parcours au palier Gratuit : HTTP 403.
- gateway volontairement arrêté : HTTP 502 confirmé côté Edge Function.
- repli applicatif couvert : catalogue Supabase conservé pour un produit déjà
  connu ; erreur explicite pour un produit totalement inconnu ; ancien résultat
  de liste conservé et horodaté si une actualisation échoue.

## Limites explicites

- aucun test tactile iPhone/simulateur n'a encore été exécuté pour ce ticket ;
- feature flag et déploiement production restent bloqués par les prérequis de
  licence et d'hébergement décrits dans ADR-007.
