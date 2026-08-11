# COUR-51 — Qualité et confiance des recettes

## Story

En tant qu'utilisateur, je veux comprendre la fiabilité des informations d'une
recette, afin de décider sans confondre une estimation avec une donnée garantie.

## Critères d'acceptation

- [x] Les 50 recettes éditoriales disposent de 50 URL de visuel distinctes.
- [x] Un contrôle automatisé échoue si un doublon de visuel réapparaît.
- [x] Chaque recette conserve au moins quatre ingrédients et trois étapes via le pipeline catalogue existant.
- [x] Les étapes sont présentées avec une hiérarchie numérotée plus lisible.
- [x] Temps, calories et budget portent explicitement la mention « estimé » ou « indicatif ».
- [x] La provenance éditoriale est affichée dans la fiche.
- [x] Les allergènes confirmés et possibles sont distingués; l'absence de correspondance n'est jamais présentée comme une garantie médicale.
- [x] Aucune macro-nutrition non sourcée n'est ajoutée à l'interface.

## Limite assumée

Les valeurs actuelles servent au prototypage et restent des estimations. Une
future donnée nutritionnelle certifiée nécessitera une source structurée et
auditée; elle n'est pas simulée dans cette version.

