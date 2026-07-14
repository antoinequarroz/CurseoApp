# ADR-001 : React Native + Expo plutôt que Flutter

## Statut : Accepté

## Contexte

Le MVP doit cibler iOS et Android avec une seule base de code, une itération rapide et un accès simple aux APIs natives (notifications, biométrie, haptics) sans configuration native lourde.

## Décision

React Native avec Expo (Managed Workflow + Expo Router) plutôt que Flutter.

## Conséquences

- Écosystème JS/TS partagé avec des compétences web existantes
- Expo Router donne un routing basé fichiers proche de Next.js, familier et rapide à onboarder
- EAS Build/Submit simplifie la CI/CD mobile sans machine macOS locale
- Contrepartie : certaines librairies natives tierces nécessitent un config plugin Expo ou un dev client
