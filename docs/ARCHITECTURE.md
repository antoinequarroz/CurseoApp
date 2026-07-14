# Architecture Courseo

## Vue d'ensemble

Courseo est une app mobile Expo/React Native avec un backend Supabase (Postgres + Auth + Storage + Edge Functions). L'état est séparé en deux couches :

- **Zustand** pour l'état client (profil en session, planning en cours d'édition, liste de courses, panier optimisé, progression de l'onboarding)
- **TanStack Query** pour toute donnée asynchrone issue de Supabase ou des mocks (recettes, prix), avec cache offline-first

## Flux principal

1. Onboarding → écrit un `Profil` dans Zustand + Supabase
2. Swipe recettes (`SwipeRecette`) → écrit dans la table `swipes`, alimente les favoris locaux
3. Planning (`PlanningHebdo`) → assemble un `PlanningHebdomadaire` en mémoire (Zustand)
4. `genererListeCourses` (lib/generateurCourses.ts) → transforme le planning en `ItemCourse[]` normalisés, fusionnés, arrondis à l'unité de vente, triés par rayon
5. `usePanierStore` → répartit les items sur les enseignes selon le mode d'optimisation, calcule les économies
6. Validation → écrit dans `commandes`, déclenche le toast d'économies

## Sécurité

- RLS sur toutes les tables utilisateur (policy `auth.uid() = profil_id`)
- Tokens d'auth dans `expo-secure-store`, jamais `AsyncStorage`
- Clé OpenAI uniquement côté serveur (secrets Edge Functions), jamais dans le bundle client
- Validation Zod côté client (formulaires) et côté serveur (Edge Functions)

Voir `docs/adr/` pour le détail des décisions et `docs/api/` pour le schéma de données et les Edge Functions.
