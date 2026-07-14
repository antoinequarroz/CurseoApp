import { useCoursesStore } from '@/stores/coursesStore';
import type { PlanningHebdomadaire, Recette } from '@/types';

const recette: Recette = {
  id: 'r-1',
  titre: 'Riz',
  description: '',
  image_url: '',
  temps_preparation: 10,
  difficulte: 'facile',
  cout_estime: 3,
  calories: 200,
  portions: 2,
  regime: [],
  allergenes: [],
  ingredients: [{ nom: 'Riz', quantite: 200, unite: 'g', rayon: 'Epicerie' }],
  etapes: [],
  est_communautaire: false,
};

const planning: PlanningHebdomadaire = {
  lundi: { midi: recette },
  mardi: {},
  mercredi: {},
  jeudi: {},
  vendredi: {},
  samedi: {},
  dimanche: {},
};

describe('coursesStore', () => {
  beforeEach(() => useCoursesStore.getState().reset());

  it('genere la liste depuis un planning', () => {
    useCoursesStore.getState().genererDepuisPlanning(planning, { nb_personnes: 2 });
    expect(useCoursesStore.getState().items).toHaveLength(1);
  });

  it('toggle l\'etat coche d\'un item', () => {
    useCoursesStore.getState().genererDepuisPlanning(planning, { nb_personnes: 2 });
    const id = useCoursesStore.getState().items[0]!.id;
    useCoursesStore.getState().toggleCoche(id);
    expect(useCoursesStore.getState().items[0]?.coche).toBe(true);
  });
});
