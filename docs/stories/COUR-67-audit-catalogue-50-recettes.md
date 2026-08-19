# COUR-67 — Audit complet du catalogue de 50 recettes

## Story

En tant que testeur, je veux des recettes cohérentes et vérifiables afin de
faire confiance au planning sans rencontrer de visuel, régime ou quantité
manifestement erroné.

## Réalisé

- contrôle reproductible des 50 identifiants et des 50 URL d'image uniques ;
- validation des titres, descriptions, durées, portions, budgets et calories ;
- au moins quatre ingrédients et trois étapes par recette ;
- détection des contradictions vegan/végétarien, sans gluten, sans lactose et
  pescétarien/allergène poisson ;
- conservation de la provenance éditoriale et des droits photo dans le CSV ;
- commande locale : `npm run catalogue:audit`.

La pertinence exacte d'une photo reste une décision éditoriale humaine. Le
script empêche les régressions mesurables, mais ne prétend pas reconnaître le
contenu d'une photographie.

## Critères d'acceptation

- [x] Les 50 lignes passent le contrôle structurel et métier.
- [x] Les 50 visuels sont distincts.
- [x] Les contradictions de régimes/allergènes font échouer le contrôle.
- [x] Une recette incomplète fait échouer le contrôle avec fichier et ligne.
- [ ] Rejouer la recette visuelle complète sur l'appareil de test après la
  prochaine build groupée (aucune build TestFlight pour ce ticket isolé).

