# COUR-33 — Scénarios sandbox : restauration, renouvellement, expiration

> Comme pour COUR-32, l'exécution réelle de ces scénarios nécessite un Mac/Xcode, un iPhone physique, un build TestFlight et un testeur sandbox App Store Connect — voir les prérequis dans [`test-sandbox-app-store.md`](./test-sandbox-app-store.md). Ce document liste les scénarios à exécuter avec leur résultat **attendu** (déduit du code actuel) ; la colonne **obtenu** est à remplir lors du test réel et jointe au ticket comme preuve datée.

Rappel utile pour le testeur : Apple accélère le cycle de vie des abonnements sandbox pour permettre ce type de test sans attendre un mois réel (durée réelle → durée sandbox approximative, comportement documenté par Apple) : 1 semaine → ~3 min, 1 mois → ~5 min, 2 mois → ~10 min, 3 mois → ~15 min, 6 mois → ~30 min, 1 an → ~1h. Un abonnement sandbox se renouvelle automatiquement jusqu'à 6 fois puis expire de lui-même — utile pour tester un renouvellement et une expiration sans action manuelle.

## Scénario 1 — Restauration après réinstallation

**Objectif** : critère « Restaurer les achats fonctionne après réinstallation ».

| # | Étape | Résultat attendu | Résultat obtenu |
|---|---|---|---|
| 1 | Acheter un palier payant (voir `test-sandbox-app-store.md`) sur l'appareil A | Palier actif, confirmé dans RevenueCat et `profils.abonnement` | |
| 2 | Désinstaller complètement l'app, la réinstaller depuis TestFlight (ou se connecter avec le même compte sur un second appareil) | L'app démarre au palier `gratuit` par défaut (nouvel `appUserID` tant que l'utilisateur ne s'est pas reconnecté à son compte Coursia) | |
| 3 | Se reconnecter avec le même compte Coursia (email/mot de passe) | `profils.abonnement` chargé depuis Supabase reflète déjà le bon palier (le webhook a persisté l'achat de l'étape 1 — la restauration RevenueCat n'est même pas strictement nécessaire ici, c'est Supabase qui fait foi) | |
| 4 | Depuis Profil → Abonnement, appuyer sur « Restaurer mes achats » (`restaurerAchats()`, `lib/revenuecat.ts`, branché COUR-33) | RevenueCat retrouve l'entitlement lié à l'Apple ID sandbox, l'app reflète immédiatement le palier via `refleterAbonnementLocal` (toast « Achats restaurés. ») | |

Code exercé à l'étape 4 : `app/(tabs)/profil.tsx` → `restaurerLesAchats()` → `restaurerAchats()` (`lib/revenuecat.ts`) → `Purchases.restorePurchases()` → `niveauDepuisCustomerInfo()`.

## Scénario 2 — Renouvellement conserve les droits

**Objectif** : critère « Le renouvellement conserve les droits ».

| # | Étape | Résultat attendu | Résultat obtenu |
|---|---|---|---|
| 1 | Acheter un abonnement mensuel sandbox | Palier actif | |
| 2 | Attendre le renouvellement automatique sandbox (~5 min pour un mensuel, voir tableau ci-dessus) sans fermer/couper l'app | RevenueCat envoie un événement `RENEWAL` au webhook | |
| 3 | Vérifier `supabase/functions/revenuecat-webhook` (logs Supabase) | Webhook reçoit `RENEWAL`, appelle `palierPrioritaire(event.entitlement_ids)` (même palier qu'à l'achat), `profils.abonnement` **inchangé** (déjà correct, pas de flicker) | |
| 4 | Observer l'app pendant/après le renouvellement | Aucune interruption d'accès aux fonctionnalités du palier, aucun message d'erreur | |

Code exercé : `supabase/functions/revenuecat-webhook/index.ts`, cas `case 'RENEWAL'` (partagé avec `INITIAL_PURCHASE`/`PRODUCT_CHANGE`).

## Scénario 3 — Expiration retire les droits au bon moment

**Objectif** : critère « L'expiration ou annulation retire les droits au bon moment ».

| # | Étape | Résultat attendu | Résultat obtenu |
|---|---|---|---|
| 1 | Acheter un abonnement sandbox, **annuler le renouvellement automatique** immédiatement après (Réglages iPhone → Apple ID sandbox → Abonnements → Annuler) | RevenueCat envoie `CANCELLATION` | |
| 2 | Observer l'app immédiatement après l'annulation | Accès **conservé** jusqu'à la fin de la période déjà payée — pas de downgrade immédiat (`case 'CANCELLATION'` du webhook : aucune action) | |
| 3 | Attendre la fin de la période sandbox (voir tableau de durées ci-dessus) | RevenueCat envoie `EXPIRATION` | |
| 4 | Observer l'app juste après l'expiration | `profils.abonnement` repasse à `'gratuit'` (`case 'EXPIRATION'` → `majAbonnement('gratuit')`), les fonctionnalités payantes redeviennent verrouillées, `PaywallModal` réapparaît au prochain tap sur une fonctionnalité gardée | |

Code exercé : `supabase/functions/revenuecat-webhook/index.ts`, cas `CANCELLATION` (no-op volontaire) puis `EXPIRATION` (downgrade immédiat).

## Scénario 4 — Mode hors-ligne : règle de grâce (COUR-33)

**Objectif** : critère « Le mode hors-ligne possède une règle de grâce documentée ». Règle complète et justification : [`matrice-droits.md` §4bis](./matrice-droits.md#4bis-règle-de-grâce-hors-ligne-cour-33).

| # | Étape | Résultat attendu | Résultat obtenu |
|---|---|---|---|
| 1 | Avec un compte abonné (palier payant confirmé), forcer l'app à se relancer (kill + reopen) avec le réseau **coupé** (mode avion) | Le fetch `profils` échoue (catch dans `app/_layout.tsx`), l'app retombe sur le dernier palier mémorisé par `lib/abonnementHorsLigne.ts` (moins de 72h depuis la dernière vérification) — les fonctionnalités du palier restent accessibles, pas de paywall intempestif | |
| 2 | Reconnecter le réseau, relancer l'app | Le fetch Supabase réussit, `profil.abonnement` (source de vérité) reprend le dessus, le cache de grâce est rafraîchi (`memoriserAbonnementVerifie`) | |
| 3 | (Test de la borne, optionnel — nécessite de modifier manuellement l'horodatage stocké ou d'attendre 72h réelles) Simuler un cache de grâce expiré (plus de 72h) puis relancer hors-ligne | `lireAbonnementAvecGrace()` retourne `null`, l'app retombe sur `'gratuit'` (deny-by-default) plutôt que de faire confiance indéfiniment à un palier potentiellement expiré entre-temps | |

Code exercé : `app/_layout.tsx` (catch du fetch profil) → `lireAbonnementAvecGrace()` (`lib/abonnementHorsLigne.ts`) → `useProfilStore.setAbonnementHorsLigne()` → `hooks/useAbonnement.ts` (repli uniquement si `profil` est `null`).

## Scénario 5 — Cohérence des états UI

**Objectif** : critère « Les états UI sont cohérents ».

| # | Étape | Résultat attendu | Résultat obtenu |
|---|---|---|---|
| 1 | Parcourir Profil → Abonnement pendant/juste après chacun des scénarios 1 à 4 | Le palier affiché (`resume` du `RowRepliable`, palier en gras dans la liste) correspond toujours à `useAbonnement().niveau`, jamais figé sur une valeur obsolète | |
| 2 | Tenter d'accéder à une fonctionnalité gardée (Comparateur de prix, Membres du foyer) juste après une expiration | Le paywall s'affiche correctement, sans crash ni état intermédiaire incohérent (ex. écran vide) | |
