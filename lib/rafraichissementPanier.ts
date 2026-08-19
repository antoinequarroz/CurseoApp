import { rechercherProduitsLive, type ProduitRechercheLive } from '@/lib/swissGroceriesRepository';
import type { LignePanierLive } from '@/stores/panierLiveStore';
import type { PreferencesCoursesEnLigne } from '@/types';

export interface ResultatRafraichissementPanier {
  collecteLe: string;
  resultats: { ligneId: string; produit: ProduitRechercheLive | null }[];
}

/**
 * Rafraîchissement volontaire uniquement. Les petits lots évitent de saturer
 * le gateway expérimental et un produit manuel n'est jamais remplacé par un
 * autre identifiant sans confirmation.
 */
export async function rafraichirPrixPanier(
  lignes: LignePanierLive[],
  preferences?: PreferencesCoursesEnLigne,
): Promise<ResultatRafraichissementPanier> {
  const resultats: ResultatRafraichissementPanier['resultats'] = [];
  for (let index = 0; index < lignes.length; index += 4) {
    const lot = lignes.slice(index, index + 4);
    const recherches = await Promise.all(
      lot.map(async (ligne) => {
        const produits = await rechercherProduitsLive(ligne.demande, preferences);
        return {
          ligneId: ligne.id,
          produit: produits.find((produit) => produit.id === ligne.produitId) ?? null,
        };
      }),
    );
    resultats.push(...recherches);
  }
  return { collecteLe: new Date().toISOString(), resultats };
}
