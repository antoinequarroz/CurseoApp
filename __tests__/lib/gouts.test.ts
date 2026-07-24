import { categoriserRecette } from '@/lib/gouts';
import type { Recette } from '@/types';

function recette(overrides: Partial<Recette>): Recette {
  return {
    id: 'r-test',
    titre: 'Recette test',
    description: '',
    image_url: '',
    temps_preparation: 20,
    difficulte: 'facile',
    cout_estime: 10,
    calories: 400,
    portions: 2,
    regime: [],
    allergenes: [],
    ingredients: [],
    etapes: [],
    est_communautaire: false,
    ...overrides,
  };
}

describe('categoriserRecette', () => {
  it('categorise poisson via un mot-cle du titre', () => {
    expect(categoriserRecette(recette({ titre: 'Saumon grillé, asperges vertes' }))).toBe('poisson');
    expect(categoriserRecette(recette({ titre: 'Poke bowl au thon' }))).toBe('poisson');
  });

  it('categorise dessert via un mot-cle du titre', () => {
    expect(categoriserRecette(recette({ titre: 'Tarte aux pommes suisse' }))).toBe('dessert');
  });

  it('categorise petit_dejeuner via un mot-cle du titre', () => {
    expect(categoriserRecette(recette({ titre: 'Petit-déjeuner équilibré au yogourt' }))).toBe('petit_dejeuner');
  });

  it('categorise dessert avant petit_dejeuner quand les deux mots-cles sont presents (ordre de priorite du code)', () => {
    expect(categoriserRecette(recette({ titre: 'Bowl petit-déjeuner smoothie' }))).toBe('dessert');
  });

  it('categorise vegetarien si le regime le indique et aucun mot-cle titre ne matche', () => {
    expect(categoriserRecette(recette({ titre: 'Risotto aux champignons', regime: ['vegetarien'] }))).toBe(
      'vegetarien',
    );
    expect(categoriserRecette(recette({ titre: 'Curry de lentilles corail', regime: ['vegan'] }))).toBe(
      'vegetarien',
    );
  });

  it('retombe sur viande par defaut', () => {
    expect(categoriserRecette(recette({ titre: 'Boeuf bourguignon', regime: [] }))).toBe('viande');
  });

  it('priorise poisson/dessert/petit-dejeuner sur le regime vegetarien', () => {
    expect(
      categoriserRecette(recette({ titre: 'Saumon grillé', regime: ['vegetarien'] })),
    ).toBe('poisson');
  });
});
