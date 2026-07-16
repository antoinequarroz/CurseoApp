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
  /** portions : nombre de personnes pour ce repas precis si different du foyer (invites). */
  assignerRecette: (jour: JourSemaine, moment: 'midi' | 'soir', recette: Recette, portions?: number) => void;
  retirerRecette: (jour: JourSemaine, moment: 'midi' | 'soir') => void;
  /** Marque explicitement "rien prevu" pour ce jour/moment (distinct de "pas encore decide"). */
  ignorerRepas: (jour: JourSemaine, moment: 'midi' | 'soir') => void;
  remplacerPlanning: (planning: PlanningHebdomadaire) => void;
  reset: () => void;
}

export const usePlanningStore = create<PlanningState>((set) => ({
  planning: PLANNING_VIDE,
  assignerRecette: (jour, moment, recette, portions) =>
    set((state) => ({
      planning: {
        ...state.planning,
        [jour]: {
          ...state.planning[jour],
          [moment]: { recette, portions },
          [`${moment}Ignore`]: false,
        },
      },
    })),
  retirerRecette: (jour, moment) =>
    set((state) => {
      const repasJour = { ...state.planning[jour] };
      delete repasJour[moment];
      repasJour[`${moment}Ignore`] = false;
      return { planning: { ...state.planning, [jour]: repasJour } };
    }),
  ignorerRepas: (jour, moment) =>
    set((state) => {
      const repasJour = { ...state.planning[jour] };
      delete repasJour[moment];
      repasJour[`${moment}Ignore`] = true;
      return { planning: { ...state.planning, [jour]: repasJour } };
    }),
  remplacerPlanning: (planning) => set({ planning }),
  reset: () => set({ planning: PLANNING_VIDE }),
}));
