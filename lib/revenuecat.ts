/**
 * Configuration RevenueCat (sandbox). Gere les 4 paliers d'abonnement
 * Coursia : gratuit, standard, premium, famille.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import Purchases, { type CustomerInfo } from 'react-native-purchases';
import type { NiveauAbonnement } from '@/types';

const extra = Constants.expoConfig?.extra ?? {};

export const ENTITLEMENT_IDS: Record<Exclude<NiveauAbonnement, 'gratuit'>, string> = {
  standard: 'standard',
  premium: 'premium',
  famille: 'famille',
};

/** A appeler une seule fois au demarrage, apres l'identification de l'utilisateur Supabase. */
export function initRevenueCat(userId: string): void {
  const apiKey =
    Platform.OS === 'ios'
      ? (extra.revenuecatKeyIos as string | undefined)
      : (extra.revenuecatKeyAndroid as string | undefined);

  if (!apiKey) {
    console.warn('[revenuecat] Cle API manquante — abonnements desactives (mode demo).');
    return;
  }

  Purchases.configure({ apiKey, appUserID: userId });
}

/** Deduit le palier d'abonnement actif a partir des entitlements RevenueCat. */
export function niveauDepuisCustomerInfo(info: CustomerInfo): NiveauAbonnement {
  const actifs = info.entitlements.active;
  if (actifs[ENTITLEMENT_IDS.famille]) return 'famille';
  if (actifs[ENTITLEMENT_IDS.premium]) return 'premium';
  if (actifs[ENTITLEMENT_IDS.standard]) return 'standard';
  return 'gratuit';
}

export const PALIERS_ABONNEMENT = [
  {
    id: 'gratuit' as const,
    nom: 'Gratuit',
    prix: 'CHF 0',
    fonctionnalites: ['25 recettes / mois', 'Planning basique', 'Liste de courses'],
  },
  {
    id: 'standard' as const,
    nom: 'Standard',
    prix: 'CHF 7.90/mois',
    fonctionnalites: ['Assistant IA', 'Comparateur de prix', 'Optimisation panier'],
  },
  {
    id: 'premium' as const,
    nom: 'Premium',
    prix: 'CHF 12.90/mois',
    fonctionnalites: ['Objectifs nutritionnels', 'Historique', 'Paniers automatiques', 'Commande 1 clic'],
  },
  {
    id: 'famille' as const,
    nom: 'Famille',
    prix: 'CHF 16.90/mois',
    fonctionnalites: ['5 profils', 'Listes partagees', 'Vote sur les menus'],
  },
];
