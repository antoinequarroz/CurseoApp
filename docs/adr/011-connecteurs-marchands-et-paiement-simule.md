# ADR-011 — Connecteurs marchands et paiement unique simulé

## Statut

Accepté pour le prototype.

## Décision

Trois frontières restent indépendantes :

1. SwissGroceries fournit uniquement catalogue, disponibilité indicative et prix.
2. `ConnecteurMarchand` porte les opérations panier, stock, livraison, commande et annulation.
3. `PaiementUniqueDemo` agrège des confirmations simulées sans débit ni transmission.

Le simulateur implémente le même contrat que les futurs connecteurs officiels, en mémoire et sans réseau. L'orchestrateur isole les enseignes pendant l'exécution mais applique une atomicité produit : au premier échec permanent, les préparations réussies sont annulées et le paiement global est interdit.

## Raisons

- Ne jamais confondre recherche de prix et autorisation de commander.
- Pouvoir brancher Migros et Coop séparément.
- Tester l'UX complète avant d'avoir les accords marchands.
- Empêcher une commande partielle silencieuse.
- Garder les données sensibles hors du moteur de démonstration et de la télémétrie.

## Conséquences

Le paiement unique réel ne pourra pas être activé par un simple changement de flag. Il exigera un PSP/marketplace adapté, des webhooks, un registre de transactions, une politique de remboursement, une revue PCI et les contrats des enseignes.
