import { rechercherProduitsLive, type ProduitRechercheLive } from '@/lib/swissGroceriesRepository';
import type { LignePanierLive } from '@/stores/panierLiveStore';
import type { Enseigne, PreferencesCoursesEnLigne } from '@/types';

export interface LigneARafraichir {
  ligne: LignePanierLive;
  enseigne: Enseigne;
}

export interface ResultatLigneRafraichie {
  ligneId: string;
  produit: ProduitRechercheLive | null;
  resolution: 'identique' | 'equivalent_automatique' | 'indisponible';
}

export interface ResultatRafraichissementPanier {
  collecteLe: string;
  resultats: ResultatLigneRafraichie[];
}

function peutRemplacerAutomatiquement(
  ligne: LignePanierLive,
  produit: ProduitRechercheLive,
  preferences?: PreferencesCoursesEnLigne,
): boolean {
  if (preferences?.substitutionMode === 'jamais') return false;
  if (produit.raisonsCorrespondance?.includes('variante_a_verifier')) return false;
  if (!produit.raisonsCorrespondance?.some((raison) => raison === 'nom' || raison === 'partiel')) {
    return false;
  }
  const hausseMax = preferences?.variationPrixMaxPct ?? 10;
  return produit.prix <= ligne.prixUnitaire * (1 + hausseMax / 100);
}

/**
 * Les petits lots évitent de saturer le gateway expérimental. Si une référence
 * disparaît, CoursIA choisit un équivalent fiable dans la même enseigne selon
 * les préférences. Le checkout reste bloqué si aucune résolution n'est sûre.
 */
export async function rafraichirPrixPanier(
  lignes: LigneARafraichir[],
  preferences?: PreferencesCoursesEnLigne,
): Promise<ResultatRafraichissementPanier> {
  const resultats: ResultatRafraichissementPanier['resultats'] = [];
  for (let index = 0; index < lignes.length; index += 4) {
    const lot = lignes.slice(index, index + 4);
    const recherches = await Promise.all(
      lot.map(async ({ ligne, enseigne }) => {
        const produits = await rechercherProduitsLive(ligne.demande, preferences);
        const identique = produits.find(
          (produit) => produit.id === ligne.produitId && produit.enseigne === enseigne,
        );
        if (identique) {
          return { ligneId: ligne.id, produit: identique, resolution: 'identique' as const };
        }
        const equivalent = produits.find(
          (produit) =>
            produit.enseigne === enseigne &&
            peutRemplacerAutomatiquement(ligne, produit, preferences),
        );
        return {
          ligneId: ligne.id,
          produit: equivalent ?? null,
          resolution: equivalent ? ('equivalent_automatique' as const) : ('indisponible' as const),
        };
      }),
    );
    resultats.push(...recherches);
  }
  return { collecteLe: new Date().toISOString(), resultats };
}
