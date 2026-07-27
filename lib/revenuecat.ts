/**
 * Configuration RevenueCat (sandbox). Gere les 4 paliers d'abonnement
 * Coursia : gratuit, standard, premium, famille.
 *
 * COUR-32 : achat sandbox de bout en bout — Purchases.configure() seul ne
 * suffit pas a rendre un achat testable, il faut aussi recuperer les vraies
 * offres du store (prix/periode reels, critere d'acceptation 1) et lancer
 * l'achat (critere 2). Le webhook (supabase/functions/revenuecat-webhook)
 * reste la source de verite persistee (ADR-004), mais l'UI doit refleter le
 * nouveau palier immediatement apres l'achat sans attendre son passage
 * (critere 3/4) — d'ou l'ecouteur CustomerInfo en plus de la reponse directe
 * de purchasePackage.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import Purchases, {
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';
import type { NiveauAbonnement } from '@/types';

const extra = Constants.expoConfig?.extra ?? {};

export const ENTITLEMENT_IDS: Record<Exclude<NiveauAbonnement, 'gratuit'>, string> = {
  standard: 'standard',
  premium: 'premium',
  famille: 'famille',
};

// COUR-32 : sans cle API (dev sans backend paiement, CI) les appels
// Purchases.* echouent ou restent en attente indefiniment — ce drapeau
// permet aux appelants de retomber sur le mode demo existant plutot que
// de tenter un appel voue a l'echec.
let revenueCatConfigure = false;

export function estRevenueCatConfigure(): boolean {
  return revenueCatConfigure;
}

/** A appeler une seule fois au demarrage, apres l'identification de l'utilisateur Supabase. */
export function initRevenueCat(userId: string): void {
  const apiKey =
    Platform.OS === 'ios'
      ? (extra.revenuecatKeyIos as string | undefined)
      : (extra.revenuecatKeyAndroid as string | undefined);

  if (!apiKey) {
    console.warn('[revenuecat] Cle API manquante — abonnements desactives (mode demo).');
    revenueCatConfigure = false;
    return;
  }

  Purchases.configure({ apiKey, appUserID: userId });
  revenueCatConfigure = true;
}

/** Deduit le palier d'abonnement actif a partir des entitlements RevenueCat. */
export function niveauDepuisCustomerInfo(info: CustomerInfo): NiveauAbonnement {
  const actifs = info.entitlements.active;
  if (actifs[ENTITLEMENT_IDS.famille]) return 'famille';
  if (actifs[ENTITLEMENT_IDS.premium]) return 'premium';
  if (actifs[ENTITLEMENT_IDS.standard]) return 'standard';
  return 'gratuit';
}

/**
 * COUR-32 critere 3/4 : reflete tout changement d'entitlements (achat,
 * restauration, renouvellement, expiration synchronisee par le SDK) dans
 * l'UI immediatement, sans redemarrage de l'app ni attente du webhook — qui
 * reste la source de verite persistee cote serveur (ADR-004), cet ecouteur
 * ne fait que mettre a jour l'affichage local.
 */
export function ecouterMisesAJourAbonnement(onChange: (niveau: NiveauAbonnement) => void): () => void {
  if (!revenueCatConfigure) return () => {};
  const listener = (info: CustomerInfo) => onChange(niveauDepuisCustomerInfo(info));
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}

/** Offres reellement configurees dans RevenueCat (prix/periode du store) — [] si non configure ou aucune offre active. */
export async function fetchOffreCourante(): Promise<PurchasesPackage[]> {
  if (!revenueCatConfigure) return [];
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages ?? [];
  } catch (error) {
    console.warn('[revenuecat] Impossible de recuperer les offres.', error);
    return [];
  }
}

export interface ResultatAchat {
  /** true si l'utilisateur a ferme/annule la fenetre native d'achat — jamais une erreur a afficher (critere 5). */
  annule: boolean;
  niveau?: NiveauAbonnement;
}

/** Lance un achat sandbox/production pour un package du store. */
export async function acheterPackage(pkg: PurchasesPackage): Promise<ResultatAchat> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { annule: false, niveau: niveauDepuisCustomerInfo(customerInfo) };
  } catch (error) {
    const e = error as { code?: PURCHASES_ERROR_CODE };
    if (e.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return { annule: true };
    throw error;
  }
}

/** Restaure les achats existants (nouvel appareil, reinstallation) — retrouve le palier sans nouvel achat. */
export async function restaurerAchats(): Promise<NiveauAbonnement> {
  const customerInfo = await Purchases.restorePurchases();
  return niveauDepuisCustomerInfo(customerInfo);
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
    // COUR-31 : doit rester synchronise avec LIMITE_MEMBRES_FAMILLE
    // (hooks/useMembresFoyer.ts), seule limite reellement appliquee cote code.
    fonctionnalites: ['6 profils', 'Listes partagees', 'Vote sur les menus'],
  },
];
