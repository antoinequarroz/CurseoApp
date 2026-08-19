# COUR-102 — Expirer une session de checkout

## Objectif

Empêcher la validation d'une simulation fondée sur un panier devenu ancien.

## Critères d'acceptation

- Une session expire 30 minutes après la création du brouillon.
- Une date absente ou invalide ferme la validation.
- L'app explique que les prix et disponibilités doivent être actualisés.
- L'utilisateur revient au panier via « Actualiser mes paniers »; aucune donnée n'est supprimée silencieusement.
- L'expiration est vérifiée à l'affichage et à nouveau au moment de l'action.
