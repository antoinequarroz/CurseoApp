# Validation COUR-53 — 10 août 2026

## Automatisation

- TypeScript : `npm run type-check` — OK.
- ESLint : `npm run lint` — OK, zéro avertissement.
- Jest avec couverture : 41 suites, 244 tests — OK.
- Tests finaux ciblés : 3 suites, 22 tests — OK.
- Couverture globale : 85,93 % des lignes; le nouveau repository atteint
  100 % des lignes et 87,5 % des instructions.
- Expo Doctor : 20/20 contrôles — OK.
- Exports de production iOS et Android — OK.
- `git diff --check` — OK.

## Données et sécurité

- Aucune migration ni Edge Function n'est ajoutée ou modifiée.
- `listes_courses` conserve sa policy RLS existante `courses_own`.
- Le repository utilise toujours le client authentifié et filtre la restauration
  par `profil_id`.
- Le cycle de session invalide les réponses réseau reçues après déconnexion.

## Appareil

Le parcours hors ligne natif n'a pas été déclaré réussi depuis Windows. Le
protocole complet se trouve dans `docs/stories/COUR-53-liste-courses-fiable.md`
et doit être joué sur la build TestFlight 16 : mode avion, redémarrage, retour
du réseau, restauration sur un second appareil et déconnexion pendant un envoi.

## Sentry

Le projet Sentry `coursia-mobile` est créé dans l'organisation
`antoinequarroz`. L'environnement EAS production contient `SENTRY_DSN`,
`SENTRY_ORG`, `SENTRY_PROJECT` et `SENTRY_AUTH_TOKEN`; le jeton d'upload est
stocké comme variable EAS sensible et n'entre pas dans le bundle. L'upload automatique des
source maps est actif : Sentry contient un artifact bundle de deux fichiers associé
à `ch.courseo.app@1.0.0+18` / dist `18`, ainsi que les dSYM natifs de CoursIA.
La symbolication de bout en bout devra encore être confirmée avec un événement réel
provenant de la build TestFlight.

## Diffusion

- Version diffusée : `1.0.0 (18)`.
- EAS Build terminé avec succès :
  `7888a015-1324-4c34-9899-fe1c73b572d9`.
- Soumission App Store Connect terminée sans erreur :
  `fa26ab45-2bcb-4608-a391-413ccdc1d341`.
- L'apparition dans TestFlight dépend encore du traitement du binaire par Apple.
