# COUR-108 — Diagnostic utilisateur sans PII

## Objectif

Donner une référence d'aide exploitable sans exposer le contenu du panier ou les données personnelles.

## Critères d'acceptation

- Un échec reçoit une référence locale `CHK-*` sélectionnable.
- Le diagnostic ne contient que des codes autorisés, le nombre d'enseignes et le nombre de tentatives.
- Tout message fournisseur inconnu est remplacé par `ERREUR_INCONNUE` avant l'interface et la télémétrie.
- Aucun produit, recherche, adresse, email ou token n'entre dans le diagnostic.
- La référence reste associée à la tentative persistée.
