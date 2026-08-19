# QA COUR-92 à COUR-94 — Panier entièrement automatique

## Vérifications automatisées

- Référence identique conservée.
- Équivalent fiable choisi dans la même enseigne.
- Variante contradictoire et dépassement de prix refusés.
- Paquets recalculés et remplacement tracé dans le brouillon.
- Article introuvable ou disponibilité inconnue bloquant le checkout.
- Absence de route et de bouton de sélection manuelle.

## Protocole appareil à exécuter lors de la prochaine release groupée

1. Ouvrir une liste contenant au moins quatre produits et lancer l'optimisation.
2. Vérifier qu'aucun écran ne demande de choisir un produit.
3. Ouvrir les paniers, actualiser et vérifier qu'un équivalent éventuel apparaît comme « Choisi automatiquement ».
4. Simuler un article introuvable : le bouton de livraison doit être désactivé.
5. Relancer avec une liste entièrement résolue : le checkout de démonstration doit redevenir accessible.

## Limite de cette livraison

Ce lot ne déclenche volontairement aucune build TestFlight. Le test iPhone sera groupé avec une future release, conformément à la demande produit.

