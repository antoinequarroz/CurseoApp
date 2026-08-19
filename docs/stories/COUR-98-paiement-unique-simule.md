# COUR-98 — Préparer un paiement unique simulé

## Objectif

Tester l'expérience d'une validation globale sans effectuer ni promettre un paiement réel.

## Livré

- Référence idempotente `PAY-DEMO-*`.
- Allocation déterministe du montant entre les commandes `SIM-*`.
- Refus d'une commande transmise, d'un montant invalide ou d'une enseigne dupliquée.
- Enregistrement de la référence et des allocations dans l'instantané de démonstration existant.

`debite` reste toujours `false`; aucun PSP ni moyen de paiement n'est appelé.
