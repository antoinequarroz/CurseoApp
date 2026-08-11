# COUR-45 - Navigation principale native

## Objectif

Rendre la navigation principale plus lisible et plus proche des conventions
iOS et Android, sans ajouter un nouvel effet visuel personnalise a maintenir.

## Realise

- La barre JavaScript personnalisee est remplacee par les onglets natifs Expo
  Router du SDK 57.
- Les icones utilisent SF Symbols sur iOS et Material Symbols sur Android.
- Quatre destinations structurent la boucle principale : Accueil, Planifier,
  Courses et Profil.
- Le nombre d'articles non coches reste visible sur l'onglet Courses.
- Economies devient une destination secondaire ouverte depuis la carte de
  synthese de l'accueil.
- Les marges basses manuelles de l'ancienne barre sont retirees au profit des
  ajustements de contenu natifs.
- Chaque onglet expose un libelle accessible et un identifiant de test stable.

## Criteres d'acceptation

- [x] Il n'y a jamais plus de quatre destinations dans la barre principale.
- [x] Les labels restent visibles sur iOS et Android.
- [x] L'onglet Courses affiche un badge uniquement quand des articles restent a
  cocher, avec une valeur plafonnee a `99+`.
- [x] La synthese Economies reste accessible en une action depuis l'accueil.
- [x] TypeScript, lint, 212 tests, Expo Doctor et bundles iOS/Android passent.
- [ ] Valider le rendu clair et sombre sur un iPhone.
- [ ] Valider le rendu et le bouton retour sur un appareil Android.
- [ ] Valider VoiceOver et TalkBack avant de clore la story selon COUR-36.

## Protocole appareil

1. Ouvrir successivement les quatre onglets et verifier l'etat selectionne.
2. Ajouter puis cocher un article et verifier l'apparition puis la disparition
   du badge Courses.
3. Depuis Accueil, ouvrir Economies puis revenir en arriere.
4. Faire defiler Accueil, Courses et Profil pour verifier que le dernier
   contenu n'est pas masque par la barre.
5. Refaire le parcours en mode sombre et avec VoiceOver ou TalkBack.
