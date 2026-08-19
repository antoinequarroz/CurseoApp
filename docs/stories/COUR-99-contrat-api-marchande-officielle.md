# COUR-99 — Préparer les connecteurs officiels

## Objectif

Définir ce qu'un futur adaptateur Migros ou Coop devra implémenter sans coupler l'application à un fournisseur.

## Contrat

- Capacités explicites : catalogue, stock, panier, livraison, commande, paiement, transmission.
- Création ou remplacement idempotent du panier.
- Vérification du stock et application du mode de substitution.
- Réservation du créneau, préparation de commande et annulation.
- Résultats normalisés indépendants des schémas propriétaires.

Une implémentation `mode: marchand` nécessitera une revue juridique, sécurité et partenaire avant activation.
