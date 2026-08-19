# COUR-70 — Des recettes adaptées à ma cuisine

## Story

En tant qu'utilisateur, je veux indiquer les équipements dont je dispose,
afin de voir en priorité des recettes que je peux réellement préparer sans
perdre l'accès au reste du catalogue.

## Critères d'acceptation

- [x] L'onboarding propose une étape facultative « Ta cuisine ».
- [x] Le profil permet de modifier les mêmes choix à tout moment.
- [x] Un profil ancien ou non renseigné ne déclenche aucun filtrage.
- [x] Les recettes compatibles apparaissent en premier.
- [x] Un filtre explicite « Seulement avec mes équipements » peut masquer les autres.
- [x] Une recette incompatible reste consultable hors filtre et indique précisément ce qui manque.
- [x] Les favoris, repas déjà planifiés et listes de courses ne disparaissent jamais à cause de ce filtre.
- [x] Le remplissage automatique conserve toutes les favorites, en privilégiant les compatibles.
- [x] Les sélections sont utilisables au lecteur d'écran et les cibles tactiles font au moins 44 points.
- [x] Le catalogue officiel possède un balisage audité, rejoué après chaque import.
- [x] Les préférences de deux comptes restent isolées par la RLS.

## Hors périmètre

- Les variantes « four ou air fryer » avec temps et températures différents.
- Le lancement automatique d'un appareil connecté.
- Un blocage dur des recettes : l'équipement est une préférence de confort, pas une règle de sécurité.

## Preuves

- `npx tsc --noEmit`, `npm run lint`, `npm test -- --coverage`.
- `supabase db reset` complet.
- `scripts/verify-catalogue.sh` puis `scripts/verify-equipements-cuisine.sh`.
- Protocole manuel : `docs/qa/COUR-70-equipements-cuisine.md`.

