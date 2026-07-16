/**
 * Preferences de gouts — swipes par recette (pour reperer les categories
 * deja cernees) et reponses au sondage frequence viande/poisson + produits
 * favoris. Persiste localement ; independant du profil Supabase pour eviter
 * une migration de schema pour de la donnee encore experimentale.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FrequenceRepas, SondageGouts } from '@/types';

interface GoutsState {
  swipes: Record<string, boolean>;
  sondage: SondageGouts;
  enregistrerSwipe: (recetteId: string, aime: boolean) => void;
  definirFrequenceViande: (frequence: FrequenceRepas) => void;
  definirFrequencePoisson: (frequence: FrequenceRepas) => void;
  ajouterProduitFavori: (produit: string) => void;
  retirerProduitFavori: (produit: string) => void;
  reset: () => void;
}

const SONDAGE_INITIAL: SondageGouts = {
  frequence_viande: null,
  frequence_poisson: null,
  produits_favoris: [],
};

export const useGoutsStore = create<GoutsState>()(
  persist(
    (set) => ({
      swipes: {},
      sondage: SONDAGE_INITIAL,
      enregistrerSwipe: (recetteId, aime) =>
        set((state) => ({ swipes: { ...state.swipes, [recetteId]: aime } })),
      definirFrequenceViande: (frequence) =>
        set((state) => ({ sondage: { ...state.sondage, frequence_viande: frequence } })),
      definirFrequencePoisson: (frequence) =>
        set((state) => ({ sondage: { ...state.sondage, frequence_poisson: frequence } })),
      ajouterProduitFavori: (produit) =>
        set((state) =>
          state.sondage.produits_favoris.includes(produit)
            ? state
            : { sondage: { ...state.sondage, produits_favoris: [...state.sondage.produits_favoris, produit] } },
        ),
      retirerProduitFavori: (produit) =>
        set((state) => ({
          sondage: {
            ...state.sondage,
            produits_favoris: state.sondage.produits_favoris.filter((p) => p !== produit),
          },
        })),
      reset: () => set({ swipes: {}, sondage: SONDAGE_INITIAL }),
    }),
    {
      name: 'coursia_gouts',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
