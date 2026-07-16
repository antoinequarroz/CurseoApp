import { usePlanningStore } from '@/stores/planningStore';
import type { Recette } from '@/types';

const recette: Recette = {
  id: 'r-1',
  titre: 'Test',
  description: '',
  image_url: '',
  temps_preparation: 10,
  difficulte: 'facile',
  cout_estime: 5,
  calories: 100,
  portions: 2,
  regime: [],
  allergenes: [],
  ingredients: [],
  etapes: [],
  est_communautaire: false,
};

describe('planningStore', () => {
  beforeEach(() => usePlanningStore.getState().reset());

  it('assigne une recette a un jour/moment donne', () => {
    usePlanningStore.getState().assignerRecette('lundi', 'midi', recette);
    expect(usePlanningStore.getState().planning.lundi.midi?.recette.id).toBe('r-1');
  });

  it('retire une recette assignee', () => {
    usePlanningStore.getState().assignerRecette('lundi', 'midi', recette);
    usePlanningStore.getState().retirerRecette('lundi', 'midi');
    expect(usePlanningStore.getState().planning.lundi.midi).toBeUndefined();
  });
});
