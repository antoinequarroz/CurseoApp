# COUR-93 — Exiger un panier 100 % résolu avant le checkout

## Objectif

Ne jamais présenter une commande comme prête lorsqu'un article n'a pas été trouvé dans un catalogue en ligne ou qu'une disponibilité a été invalidée.

## Critères d'acceptation

- Un article introuvable est un blocage, pas un simple avertissement.
- Une ligne dont la disponibilité n'est plus confirmée bloque également le checkout.
- Le bouton de livraison reste désactivé tant que ces blocages existent.
- Le même garde est recalculé dans l'écran checkout pour empêcher un contournement par navigation directe.
- Le message explique de relancer la recherche ou d'ajuster la liste, sans proposer de SKU manuel.

## Décision produit

Le prototype préfère un refus explicite à une commande silencieusement incomplète. Aucun produit local ou saisi à la main n'est mélangé aux paniers en ligne.

