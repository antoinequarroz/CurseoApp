# COUR-104 — Coupe-circuit des connecteurs

## Objectif

Maintenir tous les connecteurs fermés par défaut et séparer strictement simulation et marchand réel.

## Critères d'acceptation

- Sans mode explicite, le connecteur reste fermé.
- La simulation n'accepte qu'un adaptateur sans paiement ni transmission.
- Un canary marchand exige capacités compatibles, conformité vérifiée et autorisation serveur.
- Le checkout de démonstration refuse toujours un connecteur de mode `marchand`.
- Aucun flag client isolé ne peut activer une transmission.
