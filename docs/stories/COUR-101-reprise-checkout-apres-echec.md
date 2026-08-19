# COUR-101 — Reprendre le checkout après un échec

## Objectif

Permettre de relancer simplement une simulation multi-enseignes interrompue, sans ambiguïté sur une éventuelle commande.

## Critères d'acceptation

- Un échec affiche les états de chaque enseigne avec texte et badge.
- Le message confirme qu'aucune commande n'a été transmise et que les paniers prêts ont été annulés.
- L'action principale devient « Relancer la simulation ».
- La même clé d'idempotence est conservée afin de ne pas créer de doublon.

## Hors périmètre

Aucune reprise d'une véritable transaction marchande.
