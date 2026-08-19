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

Le prototype utilise un simulateur local déterministe par enseigne. Il déroule
les états panier, stock, substitutions, créneau et montant, puis produit une
référence `SIM-*` toujours marquée non transmise. Les préférences de substitution
et de livraison vivent dans une table privée dédiée. L'historique ne contient
que des instantanés de démonstration reprenables dans un nouveau brouillon.

Un prix SwissGroceries est une observation catalogue, jamais une confirmation
marchande. L'application affiche sa fraîcheur et exige une confirmation
explicite avant de poursuivre avec une observation ancienne. Une actualisation
ne remplace jamais silencieusement le produit choisi par un autre résultat.

Avant le checkout, une réconciliation locale distingue les blocages qui exigent
une décision humaine (correspondance incertaine, quantité insuffisante) des
simples avertissements (format, disponibilité, doublon, produit introuvable).
Les substitutions passent par un écran de comparaison explicite. Les créneaux
sont générés localement et restent marqués simulés dans tout l'instantané.

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
