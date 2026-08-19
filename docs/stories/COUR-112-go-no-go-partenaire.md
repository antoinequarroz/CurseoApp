# COUR-112 — Décision go/no-go partenaire

## Objectif

Rendre impossible une ouverture sandbox tant que les preuves techniques et organisationnelles ne sont pas réunies.

## Critères d'acceptation

- Le rapport agrège manifeste, autorisation, conformité, sécurité et juridique.
- Chaque preuve absente apparaît comme un blocage distinct.
- Un rapport sans blocage peut déclarer `pretPourSandbox=true`.
- `pretPourProduction` reste toujours `false` dans ce prototype.
- Aucune variable mobile ou décision locale ne peut transformer ce rapport en activation réelle.
