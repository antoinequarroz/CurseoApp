# COUR-95 — Synchroniser les paniers derrière un contrat marchand

## Objectif

Faire passer chaque panier enseigne par une frontière unique, remplaçable plus tard par les API officielles Migros ou Coop.

## Livré

- Contrat `ConnecteurMarchand` séparé du catalogue SwissGroceries.
- Adaptateur in-process `ConnecteurMarchandSimule` sans réseau ni PII.
- Synchronisation, stock, livraison, préparation et annulation par enseigne.
- Garde refusant tout connecteur de démonstration qui annoncerait paiement ou transmission.

## Hors périmètre

Compte marchand, API officielle, véritable panier distant et commande réelle.
