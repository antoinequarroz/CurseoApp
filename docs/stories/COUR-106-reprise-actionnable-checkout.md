# COUR-106 — Rendre les erreurs de checkout actionnables

## Objectif

Proposer la bonne prochaine action selon la nature de l'échec.

## Critères d'acceptation

- Une panne temporaire propose « Relancer la simulation ».
- Un panier partiel ou indisponible renvoie vers la vérification du panier.
- Le texte confirme toujours qu'aucune commande n'a été transmise.
- Une seule action principale est visible en bas du parcours.
- Les statuts restent exprimés par du texte et une icône, pas uniquement par une couleur.
