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

  it('COUR-25 : conserve les membres du foyer concernes par le repas (portions derivees en amont)', () => {
    usePlanningStore.getState().assignerRecette('lundi', 'soir', recette, 2, ['m-1', 'm-2']);
    const repas = usePlanningStore.getState().planning.lundi.soir;
    expect(repas?.membreIds).toEqual(['m-1', 'm-2']);
    expect(repas?.portions).toBe(2);
  });

  it('COUR-25 : sans membre selectionne, membreIds reste absent (comportement historique)', () => {
    usePlanningStore.getState().assignerRecette('lundi', 'midi', recette);
    expect(usePlanningStore.getState().planning.lundi.midi?.membreIds).toBeUndefined();
  });
});
