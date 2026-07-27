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
| Comparateur de prix multi-enseignes | Standard | `estAuMoins('standard')` — `components/courses/ComparateurPrix.tsx` | Implémenté |
| Modes d'optimisation panier (équilibré, « premium », bio, santé) | Standard | `estAuMoins('standard')` — `app/(tabs)/courses.tsx` | Implémenté — ⚠️ voir note nommage ci-dessous |
| Objectifs nutritionnels | Premium | ❌ Aucune garde de code | **Non implémenté** |
| Historique | Premium | ❌ Aucune garde de code | **Non implémenté** |
| Paniers automatiques | Premium | ❌ Aucune garde de code | **Non implémenté** |
| Commande 1 clic | Premium | ❌ Aucune garde de code | **Non implémenté** |
| Membres du foyer (jusqu'à 6 profils) | Famille | `estAuMoins('famille')` — `app/membres-foyer.tsx`, `app/(tabs)/profil.tsx`, `app/(tabs)/planifier.tsx` ; limite `LIMITE_MEMBRES_FAMILLE = 6` (`hooks/useMembresFoyer.ts`) | Implémenté |
| Listes de courses partagées | Famille | ❌ Aucune garde de code | **Non implémenté** |
| Vote sur les menus | Famille | ❌ Aucune garde de code | **Non implémenté** |

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

## 5. Dette identifiée (hors périmètre de correction immédiate)

- `niveauDepuisCustomerInfo()` (`lib/revenuecat.ts`) — dérivation du palier depuis le SDK RevenueCat côté client — n'est **appelée nulle part** dans le repo aujourd'hui : le webhook reste la seule source de vérité effective. À utiliser si un besoin d'affichage optimiste (avant confirmation webhook) apparaît, sinon à retirer pour éviter le code mort.
- Triple source de vérité à synchroniser manuellement pour la liste des 4 paliers : `lib/revenuecat.ts` (`ENTITLEMENT_IDS`), `supabase/functions/revenuecat-webhook/index.ts` (`PALIERS_VALIDES`), `supabase/schema.sql` (contrainte `CHECK`) — trois runtimes différents (React Native, Deno, SQL) empêchent un partage direct de constante ; chaque fichier référence désormais explicitement les deux autres en commentaire.
- Quota "25 recettes/mois" et fonctionnalités Premium/Famille listées "Non implémenté" au §2 : à trancher (implémenter ou retirer du paywall) dans un ticket dédié, hors périmètre de COUR-31 qui formalise la matrice sans construire de nouvelles fonctionnalités.
