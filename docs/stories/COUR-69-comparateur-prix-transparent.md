# COUR-69 — Comparateur de prix transparent

## Story

En tant que testeur, je veux distinguer un relevé indicatif d'un résultat live
et voir les enseignes sans résultat afin de ne pas interpréter la démo comme
une garantie de prix ou de stock.

## Réalisé

- avertissement permanent avant les résultats ;
- badges « Démo », « Test en direct » ou « Relevé indicatif » selon la source ;
- source et date conservées sur chaque offre ;
- prix ancien toujours signalé ;
- enseignes absentes décrites comme « sans résultat dans ce test », jamais
  comme un produit indisponible ;
- mise à jour dynamique annoncée aux technologies d'assistance.

## Critères d'acceptation

- [x] La nature expérimentale est visible avec chaque comparaison.
- [x] L'absence de résultat n'est pas confondue avec une rupture de stock.
- [x] Le prix, le format, le prix unitaire, la source et la date restent visibles.
- [x] Les états erreur, vide, hors ligne et périmé restent distincts.
- [ ] Vérifier VoiceOver et les largeurs étroites sur appareil lors de la
  prochaine build groupée.

