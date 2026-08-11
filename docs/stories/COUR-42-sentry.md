# COUR-42 - Observabilite Sentry respectueuse de la vie privee

## Story technique

En tant qu'equipe produit, nous voulons recevoir les crashs JavaScript et
natifs des builds staging et production avec des traces symboliquees, sans
transmettre de donnees identifiantes ou alimentaires.

## Criteres d'acceptation

- Sans DSN, l'application demarre et Sentry reste desactive.
- En developpement local, aucun evenement n'est envoye.
- Staging et production portent le bon environnement.
- Aucun UUID, email, token, allergie, regime ou contenu de formulaire n'est
  present dans les evenements et breadcrumbs.
- Replay, capture d'ecran, PII et performance tracing sont desactives.
- Metro genere les Debug IDs necessaires aux source maps.
- Le token d'upload est un secret EAS/CI et n'entre jamais dans le bundle.
- Une erreur volontaire staging apparait une seule fois avec les vrais fichiers
  et lignes TypeScript.
- Un crash natif est recu apres relance de l'application.

## Configuration externe

- `SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN` en secret EAS Sensitive
- Retention et scrubbing serveur alignes avec `PRIVACY.md`

## Verification

- Tests unitaires du nettoyage des evenements.
- Build staging avec upload des source maps.
- Crash JS puis natif sur appareil/simulateur.
- Verification manuelle du contenu de l'evenement Sentry.
