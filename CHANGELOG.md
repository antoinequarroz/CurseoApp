# Changelog Courseo

Format basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).

## [Unreleased]

### Added

- MVP initial : onboarding 5 étapes, swipe de recettes, planning hebdomadaire, liste de courses générée automatiquement
- Comparateur de prix multi-enseignes avec données mockées structurées comme une vraie API
- Système d'abonnement 4 paliers (RevenueCat sandbox) avec PaywallModal
- Dark mode complet piloté par préférence utilisateur (auto/clair/sombre)
- Offline-first sur la liste de courses (AsyncStorage + sync différée)
- Edge Functions Supabase : proxy OpenAI, suppression de compte (nLPD), webhook RevenueCat, waitlist
- Suite de tests Jest (stores, lib, composants critiques) — couverture > 60% sur `stores/` et `lib/`
