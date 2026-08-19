# Recette manuelle COUR-70 — Équipements de cuisine

## Prérequis

- build de développement iOS ou Android connecté au backend de test ;
- un nouveau compte et un compte existant créé avant COUR-70 ;
- catalogue de recettes chargé.

## Parcours principal

1. Créer un compte et atteindre l'étape « Que peux-tu utiliser dans ta cuisine ? ».
2. Sélectionner « Plaques de cuisson » et « Mixeur ou blender » avec le tactile,
   puis refaire l'opération avec VoiceOver ou TalkBack.
3. Terminer l'onboarding et ouvrir Profil → Équipements de cuisine.
4. Vérifier que les deux choix sont cochés et que la page peut être fermée avec
   le bouton natif de la modale.
5. Ouvrir Planifier → Recettes : les recettes compatibles doivent apparaître
   avant celles qui demandent un four.
6. Vérifier qu'une carte nécessitant un four affiche « Il te manque : Four »,
   reste consultable et peut encore être aimée/planifiée.
7. Activer « Seulement avec mes équipements » : les cartes incompatibles
   disparaissent. Désactiver le filtre et vérifier leur retour.
8. Ouvrir le détail d'une recette et vérifier la section « Équipements nécessaires ».

## Cas limites

- Compte ancien avec valeur `NULL` : aucun filtre ni avertissement trompeur.
- Tout décocher : le filtre strict ne conserve que les recettes sans équipement particulier.
- Aucun résultat strict : l'état vide propose « Afficher toutes les recettes ».
- Changer les équipements pendant le swipe : retour propre à la première carte,
  sans écran vide ni index hors limites.
- Un favori incompatible reste disponible dans le planning et dans la liste de courses.
- Tester petit iPhone, grand Android, thème clair/sombre et taille de texte agrandie.

