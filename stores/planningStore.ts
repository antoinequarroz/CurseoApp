/** Etat global du planning hebdomadaire — assignation des recettes par jour/repas. */
import { create } from 'zustand';
import type { JourSemaine, PlanningHebdomadaire, Recette } from '@/types';

const PLANNING_VIDE: PlanningHebdomadaire = {
  lundi: {},
  mardi: {},
  mercredi: {},
  jeudi: {},
  vendredi: {},
  samedi: {},
  dimanche: {},
};

interface PlanningState {
  planning: PlanningHebdomadaire;
  assignerRecette: (jour: JourSemaine, moment: 'midi' | 'soir', recette: Recette) => void;
  retirerRecette: (jour: JourSemaine, moment: 'midi' | 'soir') => void;
  remplacerPlanning: (planning: PlanningHebdomadaire) => void;
  reset: () => void;
}

export const usePlanningStore = create<PlanningState>((set) => ({
  planning: PLANNING_VIDE,
  assignerRecette: (jour, moment, recette) =>
    set((state) => ({
      planning: { ...state.planning, [jour]: { ...state.planning[jour], [moment]: recette } },
    })),
  retirerRecette: (jour, moment) =>
    set((state) => {
      const repasJour = { ...state.planning[jour] };
      delete repasJour[moment];
      return { planning: { ...state.planning, [jour]: repasJour } };
    }),
  remplacerPlanning: (planning) => set({ planning }),
  reset: () => set({ planning: PLANNING_VIDE }),
}));
