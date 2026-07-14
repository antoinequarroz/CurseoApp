# ADR-004 : RevenueCat pour la gestion des abonnements

## Statut : Accepté

## Contexte

Courseo propose 4 paliers d'abonnement facturés via l'App Store et le Play Store. Gérer soi-même les receipts, le renouvellement, la grace period et la synchronisation cross-plateforme est un projet à part entière.

## Décision

RevenueCat (sandbox pour le MVP) plutôt qu'une implémentation StoreKit/Billing directe.

## Conséquences

- RevenueCat unifie iOS/Android derrière une seule API d'entitlements (`lib/revenuecat.ts`)
- Le webhook RevenueCat (`supabase/functions/revenuecat-webhook`) est la source de vérité pour `profils.abonnement`, pas l'app cliente — évite les incohérences en cas d'app tuée pendant l'achat
- Contrepartie : dépendance à un service tiers payant au-delà d'un certain volume (acceptable pour le MVP)
