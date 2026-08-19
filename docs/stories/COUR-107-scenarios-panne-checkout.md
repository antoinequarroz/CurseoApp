# COUR-107 — Scénarios déterministes de panne

## Objectif

Reproduire les cas de panne sans dépendre d'un véritable fournisseur ni d'un réseau instable.

## Scénarios

- succès complet;
- timeout Coop avec deux tentatives puis annulation de Migros;
- panier Migros partiel avec paiement interdit.

La fabrique de scénarios est injectée explicitement dans l'orchestrateur. Aucun flag distant ou écran public ne peut l'activer.
