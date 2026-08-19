# COUR-84 — Parcours checkout de démonstration bout en bout

## Objectif

Prouver automatiquement le parcours optimisation → remplacement → réconciliation
→ créneau → orchestration, sans paiement ni transmission marchande.

## Critères d’acceptation

- le test part d’un résultat SwissGroceries et crée un brouillon ;
- un remplacement change d’enseigne seulement après confirmation ;
- le panier réconcilié ne contient plus de point bloquant ;
- un créneau simulé est choisi ;
- la confirmation finale porte `nature: simulation` et `transmise: false`.

## Preuve

`__tests__/integration/checkout-demo-parcours.test.ts`.
