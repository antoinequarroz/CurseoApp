# Architecture CoursIA

## Vue d'ensemble

CoursIA est une app mobile Expo/React Native avec un backend Supabase (Postgres + Auth + Storage + Edge Functions). L'état est séparé en deux couches :

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

## Prix suisses live — chemin isolé

`App Expo -> Edge Function swissgroceries -> gateway Node privé -> MCP`

- le catalogue `prix_courant` reste prioritaire ;
- le mobile ne connaît ni l'URL ni le secret du gateway ;
- l'Edge Function exige une session Supabase et un palier Standard+ ;
- le flag du binaire autorise seulement une requête `eligibility`; l'Edge
  retourne un booléen calculé depuis l'UUID Auth, le palier en base et le mode
  serveur. Une erreur conserve l'expérience de simulation ;
- `SWISS_GROCERIES_SERVER_MODE=off|canary|on` coupe les appels ou les limite à
  une cohorte secrète d'UUID Auth ; le flag historique reste fermé en canary
  pour rendre un rollback vers une ancienne révision sûr ;
- le gateway limite la concurrence, ouvre son circuit après trois pannes et ne
  journalise jamais les requêtes produit ou les listes ;
- `/livez` et `/readyz` pilotent les sondes du conteneur ; `/health` reste
  protégé par le Bearer privé.

Voir [ADR-007](adr/007-swissgroceries-mcp.md) et le
[runbook staging](runbooks/swissgroceries-gateway-staging.md).
