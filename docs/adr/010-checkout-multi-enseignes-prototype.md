# ADR-010 — Checkout multi-enseignes du prototype

## Statut

Accepté pour le prototype.

## Décision

SwissGroceries reste uniquement un fournisseur de catalogue et de plans de
courses. coursIA construit un brouillon local modifiable, simule les livraisons
et enregistre une commande marquée `simulation`. Aucun identifiant marchand,
aucune carte et aucun paiement réel ne transitent dans l'application.

Les capacités sont séparées en contrats indépendants. Une future API officielle
Migros ou Coop implémentera panier et commande sans modifier les écrans métier.

## Raisons

- démontrer toute l'expérience sans prétendre commander chez une enseigne ;
- préserver la sécurité et la confiance des testeurs ;
- éviter d'introduire Stripe avant la disponibilité de partenaires marchands ;
- rendre la migration vers des API officielles progressive et testable.

## Conséquences

- le prix et la disponibilité restent indicatifs ;
- les frais et créneaux de livraison sont explicitement simulés ;
- un paiement réel restera impossible tant qu'aucun adaptateur marchand et PSP
  approuvé n'est configuré.
