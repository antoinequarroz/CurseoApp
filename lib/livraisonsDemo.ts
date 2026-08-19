import type { BrouillonPanierLive, LivraisonDemo } from '@/stores/panierLiveStore';
import { sousTotalPanier } from '@/stores/panierLiveStore';

const SEUIL_GRATUITE = 80;
const FRAIS_STANDARD = 7.9;

/** Valeurs fictives stables : elles servent uniquement à tester le checkout. */
export function genererLivraisonsDemo(brouillon: BrouillonPanierLive): LivraisonDemo[] {
  return brouillon.paniers.map((panier) => ({
    enseigne: panier.enseigne,
    id: `demo-standard-${panier.enseigne}`,
    libelle: 'standard_demo',
    prix: sousTotalPanier(panier) >= SEUIL_GRATUITE ? 0 : FRAIS_STANDARD,
  }));
}
