# COUR-85 — Correspondance produits v2

## Objectif

Réduire les faux rapprochements sans présenter l’heuristique locale comme un
score fourni par SwissGroceries.

## Décision

La normalisation accepte uniquement une petite liste de synonymes sûrs. Les
variantes contradictoires, par exemple « lait entier » et « lait écrémé »,
restent visibles mais nécessitent une confirmation humaine.

## Critères d’acceptation

- pluriels, accents et synonymes sûrs sont normalisés ;
- les qualificatifs contradictoires abaissent la correspondance ;
- aucune probabilité inventée n’est montrée dans l’interface ;
- la raison de la prudence reste typée et testée.
