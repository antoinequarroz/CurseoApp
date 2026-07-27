/**
 * COUR-33 : regle de grace hors-ligne pour le palier d'abonnement. Le profil
 * (dont `abonnement`) n'est jamais persiste localement (stores/profilStore.ts
 * vit entierement en memoire, re-fetch depuis Supabase a chaque cold start,
 * voir app/_layout.tsx) — sans ca, un abonne payant qui demarre l'app hors
 * connexion perdrait silencieusement son acces premium le temps que le
 * reseau revienne (useAbonnement retombe sur 'gratuit' si `profil` est null).
 *
 * Regle retenue : le dernier palier confirme avec succes par Supabase (ou
 * par un achat/restauration RevenueCat) reste valable 72h hors-ligne — assez
 * long pour une coupure reseau ponctuelle (trajet, cave, avion), assez court
 * pour ne jamais masquer durablement une expiration/annulation reelle qui
 * n'aurait pas pu etre synchronisee. Au-dela de cette fenetre, repli
 * explicite sur 'gratuit' (deny-by-default, meme philosophie que
 * useAbonnement pour une valeur d'abonnement inconnue). Documente dans
 * docs/entitlements/matrice-droits.md.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NiveauAbonnement } from '@/types';

const CLE = 'coursia_dernier_abonnement_verifie';
const FENETRE_GRACE_MS = 72 * 60 * 60 * 1000;

interface AbonnementConnu {
  niveau: NiveauAbonnement;
  verifieLe: number;
}

/** A appeler des qu'un palier est confirme avec succes (fetch profil Supabase, achat, restauration). */
export async function memoriserAbonnementVerifie(niveau: NiveauAbonnement): Promise<void> {
  const valeur: AbonnementConnu = { niveau, verifieLe: Date.now() };
  try {
    await AsyncStorage.setItem(CLE, JSON.stringify(valeur));
  } catch {
    // Perte du cache de grace non bloquante : au pire, repli sur 'gratuit' au prochain demarrage hors-ligne.
  }
}

/** Dernier palier connu s'il est encore dans la fenetre de grace, sinon null. */
export async function lireAbonnementAvecGrace(): Promise<NiveauAbonnement | null> {
  try {
    const brut = await AsyncStorage.getItem(CLE);
    if (!brut) return null;
    const { niveau, verifieLe } = JSON.parse(brut) as AbonnementConnu;
    if (Date.now() - verifieLe > FENETRE_GRACE_MS) return null;
    return niveau;
  } catch {
    return null;
  }
}
