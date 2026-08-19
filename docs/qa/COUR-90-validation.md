# COUR-90 — Validation de la release TestFlight 1.0.1 (21)

Date : 19 août 2026

## Version publiée

- Version : `1.0.1`
- Build iOS : `21`
- Commit applicatif : `89a9dbff761b82851407d72e2c3e460634e32372`
- Build EAS : `cc404009-5203-4e87-bf5c-68f49a6f2b19`
- Soumission EAS : `2983a518-b89e-4d08-ab34-f9b27bc8c665`
- App Store Connect : application `6790903786`

## Preuves automatisées

- TypeScript : vert.
- ESLint : vert, aucun warning.
- Jest : 59 suites et 318 tests verts ; couverture globale de 87,18 % des lignes.
- Gateway SwissGroceries : 26 tests verts.
- Catalogue : 50 recettes valides et 50 visuels uniques.
- Export Expo iOS SDK 57 : vert.
- GitHub Actions : run `32279604322`, jobs `quality` et `supabase-migrations` verts. Le second job a rejoué toutes les migrations et les preuves RLS depuis un environnement Supabase vide.

## Distribution

- Build EAS iOS store terminée avec succès.
- Binaire accepté par App Store Connect le 19 août 2026.
- Apple a placé la build en traitement avant sa disponibilité TestFlight.

## Validation manuelle restante

Le test natif réel doit être effectué sur l'iPhone d'Antoine une fois le traitement Apple terminé. La procédure et les cas limites sont décrits dans `docs/qa/COUR-90-protocole-testflight.md`. Cette machine Windows ne dispose ni d'un simulateur iOS ni de l'iPhone cible ; aucun résultat manuel n'est donc fabriqué.
