# ADR-003 : Zustand + TanStack Query plutôt que Redux seul

## Statut : Accepté

## Contexte

L'app a deux natures d'état bien distinctes : de l'état client pur (planning en cours d'édition, préférences UI) et des données serveur asynchrones à mettre en cache (recettes, prix, profil).

## Décision

Zustand pour l'état client, TanStack Query v5 pour l'état serveur. Pas de store unique global façon Redux.

## Conséquences

- Zustand évite le boilerplate de Redux pour de l'état simple (pas d'actions/reducers pour un toggle de checkbox)
- React Query gère nativement le cache, le retry, le offline-first (`networkMode: 'offlineFirst'`) et la pagination (`useInfiniteQuery`) — réimplémenter ça dans Redux aurait été redondant
- Séparation claire : si la donnée vient du serveur, elle passe par un hook `use*` (React Query) ; si elle est purement locale à la session, elle passe par un store Zustand
- Persistance sélective : `coursesStore` et `onboardingStore` utilisent le middleware `persist` de Zustand sur AsyncStorage pour la résilience offline, les autres stores restent en mémoire
