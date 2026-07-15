# Coursia

Copilote intelligent des repas et des courses pour le marché suisse. De l'inspiration recette à la commande validée : planification hebdomadaire, génération automatique de la liste de courses, comparaison de prix entre les principales enseignes (Coop, Migros, Lidl, Aldi, Ottos, Manor Food).

Ce dépôt contient le **prototype MVP** — code professionnel, typé et structuré pour être repris par une équipe externe. Les prix et le comparateur utilisent des données mockées (structurées comme une vraie API) en attendant les intégrations Phase 3.

## Stack technique

- React Native + Expo SDK 57, routing par fichiers via Expo Router
- TypeScript strict (`strict: true`, `noUncheckedIndexedAccess: true`)
- NativeWind (Tailwind CSS) pour le style, design system dans `lib/theme.ts`
- Zustand pour l'état global, TanStack Query v5 pour les données asynchrones
- Supabase (Postgres, Auth, Storage, Edge Functions, RLS)
- RevenueCat pour les abonnements in-app (sandbox)
- Reanimated 3 + Gesture Handler pour les micro-interactions (swipe, checkbox, pulse)
- Jest + React Native Testing Library

## Installation

```bash
npm install
cp .env.example .env.development
# renseigner SUPABASE_URL / SUPABASE_ANON_KEY (voir supabase/schema.sql pour le schema a appliquer)
npm run start
```

### Variables d'environnement

Voir `.env.example`. Trois profils sont attendus : `.env.development`, `.env.staging`, `.env.production` (jamais commités — seul `.env.example` l'est). La clé `OPENAI_API_KEY` ne doit **jamais** être renseignée côté client : elle vit uniquement dans les secrets Supabase Edge Functions (`supabase secrets set OPENAI_API_KEY=...`), consommée par `supabase/functions/ai-assistant`.

### Base de données

Le schéma complet (tables, RLS, index, storage) est dans `supabase/schema.sql`. Applique-le sur ton projet Supabase (SQL editor ou `supabase db push`).

### Scripts

```bash
npm run start        # Expo dev server
npm run lint          # ESLint (flat config, zero warning toléré)
npm run type-check    # tsc --noEmit
npm run test          # Jest
npm run test:coverage # Jest avec seuil de couverture (60% lignes sur stores/ et lib/)
```

## Structure du projet

```
/app                    Expo Router — tous les écrans
  /(auth)                Connexion, onboarding 5 étapes
  /(tabs)                Accueil, Planifier, Courses, Économies, Profil
  /recette/[id]           Détail recette, deep-linkable (courseo://recette/123)
/components
  /ui                    Composants réutilisables (Button, Card, Badge, Skeleton, PaywallModal...)
  /recettes               SwipeRecette, RecetteCard
  /planning                PlanningHebdo, JourCard
  /courses                 ListeCourses, ProduitItem, ComparateurPrix
  /panier                  PanierEnseigneCard, RecapCommande
/lib
  supabase.ts             Client Supabase (storage = SecureStore, jamais AsyncStorage)
  revenuecat.ts            Config RevenueCat + paliers d'abonnement
  theme.ts / theme-context.tsx   Design system + dark mode
  generateurCourses.ts     Logique métier de génération de liste de courses
  /mocks                   Données mockées (20 recettes, 50 produits x 4 enseignes)
/stores                  Zustand : profil, planning, courses, panier, onboarding
/hooks                   React Query + hooks utilitaires (haptics, responsive, réseau...)
/types                   Toutes les interfaces TypeScript partagées
/supabase
  schema.sql              Schéma complet avec RLS et index
  /functions               Edge Functions (proxy OpenAI, suppression compte, webhook RevenueCat, waitlist)
/docs
  /adr                     Décisions d'architecture
  app-store-metadata.md    Textes prêts pour App Store Connect
  cgvu.md                  Conditions générales
  /landing                 Landing page pré-lancement
```

## Design system

Palette, typographie (DM Sans / Inter / DM Mono), radius et spacing sont documentés dans `tailwind.config.js` et `lib/theme.ts`. Le dark mode est piloté par `ThemeProvider` (`lib/theme-context.tsx`) — aucune couleur ne doit être hardcodée dans un composant, tout passe par `useTheme()`.

Signature visuelle : chaque card recette/produit a le coin supérieur gauche découpé en diagonale ("l'étiquette de marché", voir `components/ui/Card.tsx`).

## Ce qui n'est PAS implémenté (hors scope MVP)

- Scraping de prix (illégal sans accord des enseignes) — uniquement des mocks
- Création automatique de paniers chez les enseignes (Phase 3)
- Scan du réfrigérateur par IA (Phase 4)
- Commande vocale
- Paiements réels (RevenueCat en sandbox uniquement)

## Roadmap

- **Phase 2** — vraies données recettes/prix, dashboard modération admin, moderation d'images IA
- **Phase 3** — intégration API prix réelles, paniers automatiques chez les enseignes
- **Phase 4** — scan frigo par IA, allemand/italien (`locales/de.json`, `locales/it.json` sont déjà préparés)

## Documentation complémentaire

- `docs/ARCHITECTURE.md` — vue d'ensemble
- `docs/adr/` — décisions d'architecture (Expo, Supabase, Zustand+React Query, RevenueCat, proxy OpenAI, offline-first)
- `PRIVACY.md`, `TERMS.md`, `docs/cgvu.md` — conformité nLPD et App Store
- `CHANGELOG.md` — historique des versions (format Keep a Changelog)
