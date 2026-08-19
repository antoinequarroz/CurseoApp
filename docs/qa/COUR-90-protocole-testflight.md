# COUR-90 — Protocole TestFlight 1.0.1 (21)

## Prérequis

- installer la build `1.0.1 (21)` depuis TestFlight ;
- disposer d’un compte CoursIA et d’une adresse de démonstration ;
- activer le prototype SwissGroceries pour le compte testeur.

## Parcours principal

1. Générer une liste puis lancer l’optimisation SwissGroceries.
2. Ouvrir les paniers et vérifier le résumé de réconciliation.
3. Diminuer une quantité sous le besoin : le checkout doit être bloqué.
4. Restaurer la quantité, puis confirmer toute correspondance signalée.
5. Ouvrir « Changer », sélectionner un produit et vérifier que rien ne change
   avant « Confirmer ce remplacement ».
6. Vérifier l’ancien/nouveau prix, les paquets et le changement d’enseigne.
7. Continuer vers la livraison et choisir un créneau pour chaque enseigne.
8. Exécuter la simulation et vérifier les références `SIM-*` et la mention
   « non transmise ».
9. Ouvrir l’historique depuis Profil et reprendre la simulation.

## Cas limites

- recherche vide et erreur réseau pendant un remplacement ;
- prix ancien nécessitant une confirmation supplémentaire ;
- produit introuvable ou format inconnu : avertissement sans blocage ;
- correspondance incertaine : blocage jusqu’à confirmation ;
- texte agrandi, mode sombre et petit iPhone.

## Retours attendus

Noter l’étape, une capture, le résultat attendu, le résultat observé et la
fréquence. Rappeler qu’aucun panier marchand et aucun paiement réel ne sont créés.
