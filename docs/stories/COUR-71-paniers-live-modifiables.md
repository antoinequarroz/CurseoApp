# COUR-71 — Paniers live modifiables

## Story

En tant que testeur, je veux transformer une optimisation SwissGroceries en
paniers par enseigne, afin de vérifier et corriger les produits avant le
checkout de démonstration.

## Critères d'acceptation

- les identifiants, produits, formats, prix, enseignes, URL et heure de collecte sont conservés ;
- les quantités peuvent être augmentées, diminuées ou supprimées ;
- les totaux sont recalculés sans prix mocké ;
- le brouillon survit à une fermeture de l'application ;
- les articles non trouvés restent visibles et n'entrent pas dans le montant ;
- le mode démonstration est annoncé avant toute validation.

## Hors périmètre

- ajout dans un panier Migros/Coop réel ;
- garantie de prix ou de disponibilité.
