/** Persistance de l'onboarding — reprise a mi-parcours si l'utilisateur quitte l'app. */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Profil } from '@/types';

interface OnboardingState {
  etapeActuelle: number; // 1 a 5
  donneesPartielles: Partial<Profil>;
  estComplete: boolean;
  setEtape: (etape: number) => void;
  mettreAJourDonnees: (partiel: Partial<Profil>) => void;
  terminer: () => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      etapeActuelle: 1,
      donneesPartielles: {},
      estComplete: false,
      setEtape: (etape) => set({ etapeActuelle: etape }),
      mettreAJourDonnees: (partiel) =>
        set((state) => ({ donneesPartielles: { ...state.donneesPartielles, ...partiel } })),
      terminer: () => set({ estComplete: true }),
      reset: () => set({ etapeActuelle: 1, donneesPartielles: {}, estComplete: false }),
    }),
    { name: 'coursia_onboarding_state', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
