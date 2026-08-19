# COUR-83 — Simulateur de connecteur marchand

## Story

En tant qu'équipe coursIA, nous voulons exercer le futur contrat marchand sans
API partenaire ni donnée sensible.

## Critères d'acceptation

- machine d'état déterministe par enseigne ;
- stock, substitutions, livraison, montant et confirmation simulés dans l'ordre ;
- erreurs d'une enseigne isolées des autres ;
- résultats toujours `nature: simulation`, `transmise: false`, référence `SIM-*` ;
- aucune adresse complète, carte ou authentifiant marchand dans le moteur.
