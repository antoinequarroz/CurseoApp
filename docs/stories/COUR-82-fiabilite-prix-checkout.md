# COUR-82 — Fiabilité des prix du checkout

## Story

En tant que testeur, je veux connaître l'âge des prix et les actualiser avant
la validation afin de ne pas confondre une estimation avec un montant garanti.

## Critères d'acceptation

- état frais, récent ou ancien calculé depuis l'heure de collecte ;
- disponibilité connue/inconnue et qualité du match affichées sans couleur seule ;
- actualisation explicite avec chargement, erreur et nouvelle heure ;
- aucune garantie de prix n'est formulée.
