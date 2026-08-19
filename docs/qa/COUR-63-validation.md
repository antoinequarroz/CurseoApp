# COUR-63 — Rapport de validation

## Vérifications automatisées

- `npx tsc --noEmit` : vert ;
- `npm run lint` : vert, aucun avertissement ;
- `npm test -- --coverage` : 44 suites et 269 tests verts ;
- tests ciblés COUR-63 : 3 suites et 33 tests verts ;
- `npm run catalogue:check-images` : 50 recettes et 50 visuels uniques ;
- `supabase db reset --local` : historique complet rejoué avec succès avant la
  récupération du retour testeur ; la nouvelle migration de correction du
  visuel est idempotente et ne modifie ni RLS, ni trigger, ni Edge Function.

## Limite de validation locale

Aucun iPhone, Mac ou simulateur Android n'est accessible depuis cet
environnement Windows. Le test tactile n'est donc pas déclaré exécuté. La
build TestFlight 1.0.0 (20) doit être contrôlée avec le protocole ci-dessous.

## Protocole TestFlight build 20

1. Désinstaller coursIA, installer la build 20, puis refaire l'onboarding.
2. Vérifier « Pescétarien » et l'aide « Poisson oui, viande non ».
3. Ouvrir Planifier > Recettes et choisir lundi, midi, puis 2 portions.
4. Refuser une recette : la recette change, mais le repas reste lundi midi.
5. Aimer une recette : elle est ajoutée au lundi midi et le parcours avance au
   lundi soir.
6. Utiliser « Ne rien prévoir » : le repas est décidé sans recette et le
   parcours avance au créneau suivant.
7. Dans Planning, modifier les portions, remplacer, déplacer puis supprimer un
   repas. Vérifier l'avertissement si la destination est déjà occupée.
8. Refaire les étapes 4 à 7 hors ligne, puis réactiver le réseau et confirmer
   que les changements sont conservés.
9. Vérifier le wrap houmous et signaler toute recette dont l'image ne
   correspond toujours pas au titre.
10. Contrôler l'absence de contenu masqué par la barre de navigation sur un
    petit et un grand iPhone.

## Déploiement de données

La production contient neuf versions de migration du 28 juillet absentes du
dépôt. `supabase db push --linked --dry-run` refuse donc la migration
`20260817163042_correct_wrap_recipe_image.sql`. Une récupération automatique a
confirmé que ces versions dépendent elles-mêmes d'objets créés hors historique ;
les ajouter telles quelles casserait un `db reset` neuf. Le visuel corrigé est
prêt, mais son application en production reste bloquée jusqu'à la
resynchronisation contrôlée du schéma distant. Aucun historique n'a été réparé
ou falsifié automatiquement.
