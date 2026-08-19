# COUR-63 — Planifier directement depuis le swipe

## Story

En tant que personne qui prépare les repas du foyer, je veux choisir le jour,
le moment et le nombre de portions avant de swiper une recette, afin que mon
planning se remplisse immédiatement sans refaire la même sélection dans un
second écran.

## Retour à traiter

- remplacer le libellé ambigu « Poisson » par « Pescétarien » et expliquer
  « poisson oui, viande non » ;
- corriger le visuel erroné du wrap houmous ;
- afficher le repas ciblé au-dessus de la recette ;
- un swipe positif assigne la recette et avance au repas suivant ;
- un refus change seulement de recette, sans changer de repas ;
- permettre « Ne rien prévoir » et le réglage des portions ;
- conserver le planning comme récapitulatif modifiable : portions,
  remplacement, déplacement et suppression.

## Critères d'acceptation

- le parcours reste compréhensible sans tutoriel et conserve les tokens
  visuels actuels de coursIA ;
- tous les contrôles tactiles font au moins 44 points et exposent un libellé
  accessible ;
- le déplacement avertit lorsqu'il remplace un repas existant ;
- les changements fonctionnent hors ligne via la file de synchronisation
  existante ;
- la carte reste utilisable sur un écran iPhone compact ;
- les tests automatisés couvrent l'assignation directe, le déplacement et la
  compatibilité pescétarienne.

## Hors périmètre

- génération automatique du planning par IA ;
- ajout de nouvelles recettes au catalogue ;
- modification du modèle de données des profils ou du planning.
