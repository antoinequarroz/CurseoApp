import {
  deduireEquipementsRecette,
  equipementsManquants,
  estCompatibleAvecCuisine,
} from '@/lib/equipementsCuisine';
import type { Recette } from '@/types';

const recette = (equipements_requis?: Recette['equipements_requis']): Recette => ({
  id: 'r-1',
  titre: 'Test',
  description: '',
  image_url: '',
  temps_preparation: 20,
  difficulte: 'facile',
  cout_estime: 8,
  calories: 300,
  portions: 2,
  regime: [],
  allergenes: [],
  ingredients: [],
  etapes: ['Mixer puis cuire au four.'],
  est_communautaire: false,
  equipements_requis,
});

describe('equipementsCuisine', () => {
  it('deduit les besoins des anciennes recettes sans metadonnees', () => {
    expect(deduireEquipementsRecette(recette())).toEqual(['four', 'mixeur']);
  });

  it('distingue un profil non renseigne d une selection vide explicite', () => {
    expect(equipementsManquants(recette(['four']), null)).toEqual([]);
    expect(equipementsManquants(recette(['four']), [])).toEqual(['four']);
  });

  it('exige tous les equipements declares', () => {
    expect(estCompatibleAvecCuisine(recette(['four', 'mixeur']), ['four'])).toBe(false);
    expect(estCompatibleAvecCuisine(recette(['four', 'mixeur']), ['four', 'mixeur'])).toBe(true);
  });
});
