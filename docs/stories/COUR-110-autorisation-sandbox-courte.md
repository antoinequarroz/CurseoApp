# COUR-110 — Autorisation sandbox courte

## Objectif

Exiger une décision serveur limitée dans le temps avant chaque session avec une sandbox officielle.

## Critères d'acceptation

- L'autorisation cible une enseigne, l'audience CoursIA et l'environnement sandbox.
- Sa durée maximale est de 15 minutes.
- Une décision refusée, expirée, trop longue ou destinée à une autre enseigne est rejetée.
- Le jeton opaque doit avoir un format minimal sûr et ne peut pas être persisté.
- Le serveur partenaire doit revérifier ce jeton à chaque appel; la validation mobile n'est qu'une défense supplémentaire.
