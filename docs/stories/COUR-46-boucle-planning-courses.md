# COUR-46 - Boucle Planning vers liste de courses

## Objectif

Permettre a un utilisateur qui vient de planifier sa semaine de produire sa
liste de courses sans revenir a l'accueil, avec une formulation honnete sur ce
qui est automatique et ce qui ne repose pas encore sur l'IA.

## Realise

- L'action deterministe est nommee « Remplir avec mes favoris » dans le code
  comme dans l'interface.
- Cette action reste desactivee tant qu'aucune recette n'a ete ajoutee aux
  favoris et explique comment la rendre disponible.
- Les favoris sont relus depuis le stockage persistant, y compris lorsqu'ils
  ne figurent pas encore dans une page visible du carrousel.
- Le planning indique le nombre de repas reels utilises pour creer la liste.
- Une action secondaire consolide les ingredients, conserve les articles
  ajoutes manuellement, puis ouvre directement Courses.
- Les textes et indications d'accessibilite sont localises.

## Criteres d'acceptation

- [x] Aucun label IA ne decrit la repartition locale des favoris.
- [x] Une semaine sans favori ne declenche pas une fausse generation reussie.
- [x] Une semaine sans repas ne permet pas de creer une liste vide.
- [x] Les favoris restent disponibles apres un redemarrage sur le meme compte.
- [x] La deconnexion efface les favoris locaux pour ne pas les exposer au
  compte suivant sur un appareil partage.
- [x] Les articles libres survivent a une regeneration depuis le planning.
- [x] Une regeneration remplace les anciens ingredients de recettes.
- [x] TypeScript, lint, 214 tests et bundles iOS/Android passent.
- [ ] Valider le parcours Planning -> Courses sur appareil ou simulateur.

## Protocole appareil

1. Ajouter deux recettes aux favoris puis ouvrir Planning.
2. Utiliser « Remplir avec mes favoris » et verifier les repas ajoutes.
3. Ajouter un article libre dans Courses, revenir au planning et regenerer la
   liste.
4. Verifier que les ingredients sont recalcules, que l'article libre subsiste
   et que la navigation ouvre Courses.
