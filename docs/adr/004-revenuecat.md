# ADR-004 : RevenueCat pour la gestion des abonnements

## Statut : Accepté

## Contexte

Coursia propose 4 paliers d'abonnement facturés via l'App Store et le Play Store. Gérer soi-même les receipts, le renouvellement, la grace period et la synchronisation cross-plateforme est un projet à part entière.

## Décision

RevenueCat (sandbox pour le MVP) plutôt qu'une implémentation StoreKit/Billing directe.

## Conséquences

- RevenueCat unifie iOS/Android derrière une seule API d'entitlements (`lib/revenuecat.ts`)
- Le webhook RevenueCat (`supabase/functions/revenuecat-webhook`) est la source de vérité pour `profils.abonnement`, pas l'app cliente — évite les incohérences en cas d'app tuée pendant l'achat
- Contrepartie : dépendance à un service tiers payant au-delà d'un certain volume (acceptable pour le MVP)

Matrice complète des droits par palier (fonctionnalités, limites, product ids, comportement en cas de droit inconnu/expiré) : [`docs/entitlements/matrice-droits.md`](../entitlements/matrice-droits.md) (COUR-31).

Protocole de test d'achat sandbox App Store de bout en bout (nécessite Mac/Xcode/iPhone/TestFlight — hors de portée d'un agent sans accès à ce matériel) : [`docs/entitlements/test-sandbox-app-store.md`](../entitlements/test-sandbox-app-store.md) (COUR-32).

Scénarios sandbox restauration/renouvellement/expiration + règle de grâce hors-ligne : [`docs/entitlements/scenarios-cycle-de-vie-abonnement.md`](../entitlements/scenarios-cycle-de-vie-abonnement.md) (COUR-33).
