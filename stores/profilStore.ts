/** Etat global du profil foyer — preferences, restrictions, abonnement. */
import { create } from 'zustand';
import type { Profil } from '@/types';

interface ProfilState {
  profil: Profil | null;
  setProfil: (profil: Profil) => void;
  mettreAJourPreferences: (partiel: Partial<Profil>) => void;
  reset: () => void;
}

export const useProfilStore = create<ProfilState>((set) => ({
  profil: null,
  setProfil: (profil) => set({ profil }),
  mettreAJourPreferences: (partiel) =>
    set((state) => (state.profil ? { profil: { ...state.profil, ...partiel } } : state)),
  reset: () => set({ profil: null }),
}));
