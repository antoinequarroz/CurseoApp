# COUR-68 — Planning vers liste de courses fiable

## Story

En tant que foyer, je veux que ma liste reflète les repas et les portions sans
effacer ce que j'ai déjà coché ou ajouté manuellement.

## Réalisé

- conversion masse/volume, y compris cuillères à soupe et à café ;
- fusion de synonymes usuels (`œufs`/`oeuf`, pommes de terre, pavés de saumon) ;
- séparation des conditionnements non comparables (`botte` ≠ `unité`) ;
- identifiants générés stables ;
- conservation du cochage d'un ingrédient encore présent après régénération ;
- conservation des articles libres et de la file de synchronisation hors ligne.

## Critères d'acceptation

- [x] Les portions du repas priment sur le nombre par défaut du foyer.
- [x] Les unités compatibles fusionnent et les unités incompatibles restent séparées.
- [x] Les ajouts libres et le cochage ne disparaissent pas à la régénération.
- [x] Les cas sont couverts par des tests unitaires et de store.
- [ ] Vérifier le parcours planning → liste en mode avion sur appareil lors de
  la prochaine build groupée.

