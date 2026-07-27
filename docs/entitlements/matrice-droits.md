# Matrice des droits — Gratuit, Standard, Premium, Famille

> **Statut : proposition à valider par les fondateurs** (critère d'acceptation COUR-31 « La matrice est validée par les fondateurs »). Ce document formalise l'état actuel du code et des textes marketing, corrige les incohérences trouvées entre eux, et propose les éléments manquants (tarifs annuels, product ids) — il ne remplace pas une validation humaine du business plan.

Référence : [ADR-004 — RevenueCat](../adr/004-revenuecat.md). Source de vérité runtime : le webhook `supabase/functions/revenuecat-webhook` écrit `profils.abonnement`, jamais l'app cliente directement (voir « Comportement en cas de droit inconnu ou expiré » ci-dessous).

## 1. Paliers, prix et identifiants

| Palier | Entitlement RevenueCat (`ENTITLEMENT_IDS`, `lib/revenuecat.ts`) | Prix mensuel | Prix annuel (proposé) | Product ID iOS (proposé) | Product ID Android (proposé) |
|---|---|---|---|---|---|
| Gratuit | — (aucun entitlement, palier par défaut) | CHF 0 | CHF 0 | — | — |
| Standard | `standard` | CHF 7.90 | CHF 79.00 (≈ 2 mois offerts) | `coursia_standard_monthly` / `coursia_standard_annual` | idem (même convention Play Console) |
| Premium | `premium` | CHF 12.90 | CHF 129.00 | `coursia_premium_monthly` / `coursia_premium_annual` | idem |
| Famille | `famille` | CHF 16.90 | CHF 169.00 | `coursia_famille_monthly` / `coursia_famille_annual` | idem |

Les product ids et prix annuels sont une **proposition** : aucun produit annuel n'existe aujourd'hui dans le code ni (à notre connaissance) dans le dashboard RevenueCat/App Store Connect/Play Console — ces produits doivent être créés sur les plateformes tierces (hors dépôt) puis reliés aux `ENTITLEMENT_IDS` existants dans RevenueCat avant d'être vendables. Le montant "≈ 2 mois offerts" est un point de départ usuel, à trancher par les fondateurs.

## 2. Matrice fonctionnalité × palier minimal

| Fonctionnalité | Palier minimal | Application technique | Statut |
|---|---|---|---|
| Planning basique, swipe recettes, liste de courses | Gratuit | Aucune garde (accès par défaut) | Implémenté |
| Catalogue de recettes (consultation) | Gratuit | Aucune garde | Implémenté |
| Recettes communautaires — lecture et soumission (COUR-29/30) | Gratuit | RLS `recettes_read`/`recettes_insert`, aucune garde de palier | Implémenté (non restreint par palier) |
| Quota de 25 recettes/mois (catalogue) | Gratuit (limite au-delà) | ⚠️ Aucun compteur — texte marketing uniquement (`PALIERS_ABONNEMENT`, `lib/revenuecat.ts`) | **Non implémenté** — à trancher : soit implémenter un quota mensuel réel, soit retirer/reformuler ce texte |
| Assistant IA | Standard | `supabase/functions/ai-assistant` : `profil.abonnement !== 'gratuit'`, rate-limité 20 req/h/utilisateur | Implémenté |
| Comparateur de prix multi-enseignes | Standard | `estAuMoins('standard')` — `components/courses/ComparateurPrix.tsx` — **client uniquement**, voir note ci-dessous | Implémenté |
| Modes d'optimisation panier (équilibré, « premium », bio, santé) | Standard | `estAuMoins('standard')` — `app/(tabs)/courses.tsx` | Implémenté — ⚠️ voir note nommage ci-dessous |
| Objectifs nutritionnels | Premium | ❌ Aucune garde de code | **Non implémenté** |
| Historique | Premium | ❌ Aucune garde de code | **Non implémenté** |
| Paniers automatiques | Premium | ❌ Aucune garde de code | **Non implémenté** |
| Commande 1 clic | Premium | ❌ Aucune garde de code | **Non implémenté** |
| Membres du foyer (jusqu'à 6 profils) | Famille | `estAuMoins('famille')` (client) **+ trigger serveur** `trg_verifier_ajout_membre_foyer` (COUR-35, `20260727010000_membres_foyer_garde_palier.sql`) : rejette l'INSERT si le palier du responsable n'est pas Famille, et la limite de 6 est désormais réellement appliquée en base (pas seulement côté app) | Implémenté (client + serveur) |
| Listes de courses partagées | Famille | ❌ Aucune garde de code | **Non implémenté** |
| Vote sur les menus | Famille | ❌ Aucune garde de code | **Non implémenté** |

**COUR-35 — audit client vs serveur** : avant ce ticket, la seule fonctionnalité payante protégée aussi côté serveur était l'Assistant IA (`ai-assistant` vérifie `profil.abonnement` avant de répondre). Toutes les autres gardes n'existaient que côté client (`estAuMoins`), y compris **Membres du foyer** — un utilisateur authentifié pouvait appeler directement l'API REST Supabase (`POST /rest/v1/membres_foyer`) en contournant entièrement le paywall et la limite de 6, sans qu'aucun état local ne s'y oppose. Corrigé par un trigger `BEFORE INSERT` (voir tableau ci-dessus).

**Comparateur de prix — lecture des données de prix reste publique, en connaissance de cause** : `offres_magasin`/`prix_historique`/`produits_canoniques`/`enseignes` ont une RLS `for select using (true)` (COUR-16, choix explicite pour permettre la comparaison sans authentification). Un utilisateur non-Standard peut donc lire ces données via un appel REST direct, même si l'écran du comparateur le bloque. Contrairement à Membres du foyer, ceci n'a pas été durci dans ce ticket : la donnée (prix publics en grande surface) n'est pas confidentielle et l'exposer ne cause pas de préjudice direct — le palier Standard vend surtout l'agrégation/UX de comparaison, pas un secret. À confirmer par les fondateurs si un blocage serveur strict est malgré tout souhaité.

**Note nommage** : le mode d'optimisation panier littéral `'premium'` (`ModeOptimisation`, `types/index.ts`) est un nom de mode de tri du panier, **sans rapport** avec le palier d'abonnement `'premium'` (`NiveauAbonnement`) — il est débloqué dès le palier **Standard**. Coïncidence de nom à garder en tête pour éviter toute confusion en revue de code ou en support client.

**Lecture du tableau** : toute fonctionnalité marquée « Non implémenté » est un engagement marketing (`PALIERS_ABONNEMENT`) sans contrepartie technique actuelle — à prioriser dans un ticket dédié ou à retirer du paywall tant qu'elle n'existe pas, pour ne jamais présenter aux fondateurs/utilisateurs une fonctionnalité vendue mais absente.

## 3. Limites numériques

| Limite | Palier | Valeur | Où elle est appliquée |
|---|---|---|---|
| Membres du foyer | Famille | 6 | `LIMITE_MEMBRES_FAMILLE`, `hooks/useMembresFoyer.ts` — uniquement côté app, aucune contrainte DB associée |
| Recettes consultables / mois | Gratuit | 25 (texte marketing) | Non appliqué techniquement (voir tableau §2) |
| Requêtes Assistant IA | Standard+ | 20 / heure / utilisateur | `RATE_LIMIT_PAR_HEURE`, `supabase/functions/ai-assistant/index.ts` — uniforme à tous les paliers payants, pas de différenciation Standard/Premium/Famille |

Aucune autre limite mensuelle/annuelle n'est aujourd'hui codée en dur ailleurs dans le repo (grep `MAX_`/`LIMITE_` sur `hooks/`, `lib/`, `stores/`, `app/`, `components/`, `supabase/functions/`).

## 4. Comportement en cas de droit inconnu ou expiré

| Situation | Comportement |
|---|---|
| Webhook reçoit un `entitlement_id` hors des 4 paliers connus | Rejet explicite HTTP 422, `profils.abonnement` **non modifié** (reste sur sa dernière valeur valide) ; RevenueCat retente automatiquement un webhook non-2xx |
| Webhook `INITIAL_PURCHASE`/`RENEWAL`/`PRODUCT_CHANGE` sans `entitlement_ids` | Rejet explicite HTTP 422 (jamais de palier deviné par défaut) — voir `supabase/functions/revenuecat-webhook/index.ts` |
| Plusieurs entitlements actifs simultanément (ex. changement de palier en cours) | Priorité **Famille > Premium > Standard** — même ordre côté webhook (`palierPrioritaire`) et côté client (`niveauDepuisCustomerInfo`, `lib/revenuecat.ts`) |
| `profils.abonnement` contient une valeur invalide (ne devrait jamais arriver, protégé par la contrainte `CHECK` de `supabase/schema.sql`) | `useAbonnement` retombe explicitement sur `'gratuit'` plutôt que de se comporter de façon indéfinie (défense en profondeur côté client) |
| Abonnement expiré (`EXPIRATION`) | Downgrade immédiat vers `'gratuit'` |
| Annulation (`CANCELLATION`) | Accès conservé jusqu'à la fin de la période déjà payée — pas de downgrade immédiat (comportement standard App Store/Play Store) |
| Incident de paiement (`BILLING_ISSUE`) | Pas de downgrade immédiat (grace period Apple de 16 jours) ; notification insérée dans `notifications` pour informer l'utilisateur — envoi d'email non implémenté (`TODO` explicite dans le webhook) |
| App démarrée hors-ligne, fetch `profils` impossible (COUR-33) | Voir §4bis « Règle de grâce hors-ligne » ci-dessous |

## 4bis. Règle de grâce hors-ligne (COUR-33)

Le profil (donc `abonnement`) n'est **jamais persisté localement** : `stores/profilStore.ts` vit entièrement en mémoire et est re-fetch depuis Supabase à chaque démarrage (`app/_layout.tsx`). Sans règle explicite, un abonné payant qui ouvre l'app sans réseau (avion, cave, coupure) perdrait silencieusement son accès premium le temps que la connexion revienne, puisque `useAbonnement` retombe sur `'gratuit'` quand `profil` est `null`.

**Règle retenue** (`lib/abonnementHorsLigne.ts`) : le dernier palier confirmé avec succès (fetch Supabase réussi, achat ou restauration RevenueCat) est mémorisé localement (`AsyncStorage`, horodaté) et reste valable **72 heures** hors-ligne. Passé ce délai, repli explicite sur `'gratuit'` — même philosophie deny-by-default que pour une valeur d'abonnement inconnue (§4).

- **Pourquoi 72h** : assez long pour couvrir une coupure réseau ponctuelle (trajet, zone blanche, avion) sans frustrer un abonné légitime ; assez court pour ne jamais masquer durablement une expiration ou annulation réelle qui n'aurait pas pu être synchronisée faute de réseau.
- **Portée** : ce cache ne contient que le palier (`NiveauAbonnement`) et son horodatage de vérification — jamais le reste du profil (préférences, foyer, etc.), qui continue de nécessiter un vrai fetch Supabase.
- **Priorité** : `profil.abonnement` (Supabase, chargé avec succès) prime toujours sur le palier de grâce — celui-ci n'intervient que quand `profil` est `null` (`hooks/useAbonnement.ts`, champ `abonnementHorsLigne` de `profilStore`).
- **Écriture du cache** : à chaque `setProfil()` réussi, et à chaque `refleterAbonnementLocal()` (achat/restauration RevenueCat confirmés côté client, avant même le passage du webhook).

## 5. Dette identifiée (hors périmètre de correction immédiate)

- ~~`niveauDepuisCustomerInfo()` jamais appelée~~ — **résolu par COUR-32** : utilisée par `acheterPackage()`, `restaurerAchats()` et `ecouterMisesAJourAbonnement()` pour refléter le palier côté client immédiatement après achat/restauration, avant confirmation du webhook (qui reste la source de vérité persistée, ADR-004).
- Triple source de vérité à synchroniser manuellement pour la liste des 4 paliers : `lib/revenuecat.ts` (`ENTITLEMENT_IDS`), `supabase/functions/revenuecat-webhook/index.ts` (`PALIERS_VALIDES`), `supabase/schema.sql` (contrainte `CHECK`) — trois runtimes différents (React Native, Deno, SQL) empêchent un partage direct de constante ; chaque fichier référence désormais explicitement les deux autres en commentaire.
- Quota "25 recettes/mois" et fonctionnalités Premium/Famille listées "Non implémenté" au §2 : à trancher (implémenter ou retirer du paywall) dans un ticket dédié, hors périmètre de COUR-31 qui formalise la matrice sans construire de nouvelles fonctionnalités.
