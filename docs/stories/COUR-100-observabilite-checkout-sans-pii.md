# COUR-100 — Observer le checkout sans PII

## Objectif

Diagnostiquer les étapes marchandes sans envoyer les produits, préférences, adresses, emails ou tokens.

## Livré

- Breadcrumbs Sentry limités à l'étape, l'enseigne, la tentative et un code technique.
- Tags d'erreur sur une forme fermée et testée.
- Aucun replay, trace, capture d'écran ou contenu du panier.
- Journalisation des reprises, préparations et annulations globales.

La télémétrie reste soumise au nettoyage global défini dans `lib/sentry.ts`.
