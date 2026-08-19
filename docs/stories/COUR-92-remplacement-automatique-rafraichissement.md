# COUR-92 — Remplacer automatiquement une référence disparue

## Objectif

Quand une référence n'est plus renvoyée par SwissGroceries, conserver un parcours entièrement automatique sans demander à l'utilisateur de choisir un SKU.

## Critères d'acceptation

- La référence identique est conservée si elle existe toujours dans la même enseigne.
- Sinon, un équivalent est choisi uniquement dans cette enseigne, sans variante contradictoire et dans la hausse de prix configurée.
- Le mode `jamais` interdit le remplacement; l'ancien mode `demander` est traité comme automatique pour éviter un parcours manuel.
- Si aucun équivalent fiable n'existe, la ligne est marquée non confirmée.
- Un remplacement recalcule les paquets et conserve la trace du produit remplacé.

## Hors périmètre

- Écriture dans un véritable panier marchand.
- Changement automatique d'enseigne pendant un simple rafraîchissement.
- Paiement ou transmission de commande.

