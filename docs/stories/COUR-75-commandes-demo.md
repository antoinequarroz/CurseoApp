# COUR-75 — Confirmation multi-enseignes simulée

## Story

En tant que testeur, je veux recevoir une confirmation globale et le détail de
chaque enseigne afin de comprendre ce que produirait un checkout unifié.

## Critères d'acceptation

- une seule ligne `commandes` conserve le snapshot complet ;
- `nature = simulation` empêche toute confusion avec une commande marchande ;
- chaque enseigne possède son sous-total et sa livraison ;
- la référence de paiement ne contient aucune donnée bancaire ;
- la RLS empêche un compte de lire ou créer une commande pour un autre compte.
