# COUR-76 — Contrats des futurs connecteurs officiels

## Story

En tant qu'équipe coursIA, nous voulons isoler les capacités catalogue, panier,
commande et paiement afin de remplacer les simulateurs par les API officielles
sans réécrire l'application.

## Critères d'acceptation

- `CatalogueEnseigne` couvre recherche, prix et disponibilité ;
- `PanierEnseigneConnecteur` couvre création et modification d'un panier ;
- `CommandeEnseigneConnecteur` couvre livraison et création de commande ;
- chaque capacité est déclarée explicitement ;
- le connecteur SwissGroceries ne prétend pas supporter panier ou commande ;
- le simulateur n'est jamais activable comme connecteur marchand en production.
