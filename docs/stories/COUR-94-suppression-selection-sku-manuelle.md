# COUR-94 — Supprimer la sélection manuelle de SKU

## Objectif

Faire de la validation globale du panier le seul geste utilisateur lié au choix des produits.

## Critères d'acceptation

- L'écran et la route de remplacement manuel ne font plus partie de l'application.
- Le réglage « Toujours me demander » n'est plus proposé.
- Une préférence historique `demander` est normalisée visuellement vers `automatique_equivalent`.
- Le mode `jamais` reste disponible pour les personnes qui refusent toute substitution; il conduit alors à un panier bloqué si une référence disparaît.

## Compatibilité

La valeur `demander` reste acceptée par le type et la base pendant la transition afin de ne pas casser les profils existants.

