# COUR-47 — Étendre le catalogue du prototype à 50 recettes

## Intention

En tant que testeur du prototype coursIA, je veux disposer d'un catalogue assez
varié pour planifier plusieurs semaines, afin d'évaluer la boucle Planning →
Liste de courses sans revoir immédiatement les mêmes propositions.

## Périmètre

- Ajouter 35 recettes publiées aux 15 recettes existantes.
- Utiliser seulement le référentiel d'ingrédients déjà déployé.
- Conserver les données nutritionnelles détaillées vides sans source fiable.
- Importer par le pipeline atomique et idempotent existant.
- Vérifier le volume et l'idempotence sur une base locale recréée intégralement.

## Critères d'acceptation

- [x] Les deux fichiers CSV passent le mode `--dry-run` sans erreur.
- [x] Un `supabase db reset` complet rejoue toutes les migrations locales.
- [x] `scripts/verify-catalogue.sh` confirme au moins 50 recettes publiées.
- [x] Chaque recette du catalogue possède au moins quatre ingrédients et trois
      étapes.
- [x] Un second import ne crée aucun doublon.
- [x] Les 35 nouvelles clés externes sont présentes en production après import.
- [x] L'API anonyme ne permet pas d'écrire le catalogue.
- [x] `tsc`, lint et la suite complète de tests restent verts.

## Preuves d'exécution — 10 août 2026

- Reset local : historique complet rejoué de `20260714000000` à
  `20260809123024`, puis `supabase/seed.sql` appliqué.
- Vérification locale : 55 recettes publiées avec les 5 recettes de seed, 211
  lignes d'ingrédients, 50 recettes `catalogue*` complètes, second import sans
  variation de volume, RPC opérateur refusée en HTTP 401 avec la clé anonyme.
- Production : 50 recettes publiées, 35 clés COUR-47 présentes de
  `catalogue-v1-r-021` à `catalogue-v1-r-055`, RPC opérateur refusée en HTTP
  401 avec la clé anonyme.
- Qualité : `npx tsc --noEmit`, `npm run lint` et 36 suites / 214 tests avec
  couverture exécutés avec succès.

## Hors périmètre

- Prix réels et disponibilité par enseigne.
- Calcul nutritionnel certifié.
- Génération de recettes par IA.
- Illustrations uniques et audit final des licences pour une sortie publique.
- Objectif business de 500 recettes.

## Definition of Done

Appliquer `docs/DEFINITION_OF_DONE.md`. Aucun changement de schéma ou de RLS
n'est introduit par cette story, mais le reset complet et le test avec une clé
anonyme restent nécessaires pour prouver l'intégration au backend existant.
