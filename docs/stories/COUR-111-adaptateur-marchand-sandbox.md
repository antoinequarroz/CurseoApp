# COUR-111 — Adaptateur marchand sandbox

## Objectif

Exercer le futur contrat officiel sans toucher aux paniers ni aux paiements réels.

## Critères d'acceptation

- La construction exige un manifeste valide et une autorisation validée.
- Chaque opération refuse une autorisation expirée.
- Le transport est injecté et testable sans réseau.
- La préparation accepte uniquement une référence `SANDBOX-*`, `nature=simulation` et `transmise=false`.
- Le jeton reste dans un champ privé non sérialisable.
- Le checkout public de démonstration refuse ce mode sandbox.
