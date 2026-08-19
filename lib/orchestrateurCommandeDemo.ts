import {
  SimulateurConnecteurMarchand,
  type ResultatCommandeSimulee,
} from '@/lib/simulateurConnecteurMarchand';
import type { PreferencesCoursesEnLigne } from '@/types';
import type { BrouillonPanierLive, LivraisonDemo } from '@/stores/panierLiveStore';

export interface ResultatOrchestrationDemo {
  confirmations: ResultatCommandeSimulee[];
  echecs: { enseigne: string; code: string }[];
}

export function orchestrerCommandeDemo(
  brouillon: BrouillonPanierLive,
  livraisons: LivraisonDemo[],
  preferences: PreferencesCoursesEnLigne,
): ResultatOrchestrationDemo {
  const confirmations: ResultatCommandeSimulee[] = [];
  const echecs: ResultatOrchestrationDemo['echecs'] = [];
  for (const panier of brouillon.paniers) {
    try {
      if (
        preferences.enseignesAutorisees.length > 0 &&
        !preferences.enseignesAutorisees.includes(panier.enseigne)
      ) {
        throw new Error('ENSEIGNE_NON_AUTORISEE');
      }
      const simulateur = new SimulateurConnecteurMarchand(panier.enseigne);
      simulateur.configurerArticles(panier.articles);
      simulateur.verifierStock();
      simulateur.resoudreSubstitutions(preferences.substitutionMode);
      simulateur.reserverCreneau();
      const livraison = livraisons.find((option) => option.enseigne === panier.enseigne);
      simulateur.confirmerMontant(livraison?.prix ?? 0);
      confirmations.push(simulateur.creerCommandeSimulee(brouillon.id));
    } catch (error) {
      echecs.push({
        enseigne: panier.enseigne,
        code: error instanceof Error ? error.message : 'ERREUR_INCONNUE',
      });
    }
  }
  return { confirmations, echecs };
}
