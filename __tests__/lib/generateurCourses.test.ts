import { genererListeCourses } from '@/lib/generateurCourses';
import type { PlanningHebdomadaire, Recette } from '@/types';

const recetteTest: Recette = {
  id: 'r-test',
  titre: 'Test pâtes',
  description: '',
  image_url: '',
  temps_preparation: 20,
  difficulte: 'facile',
  cout_estime: 5,
  calories: 400,
  portions: 2,
  regime: [],
  allergenes: [],
  ingredients: [{ nom: 'Pâtes', quantite: 200, unite: 'g', rayon: 'Epicerie' }],
  etapes: [],
  est_communautaire: false,
};

const planningVide: PlanningHebdomadaire = {
  lundi: {},
  mardi: {},
  mercredi: {},
  jeudi: {},
  vendredi: {},
  samedi: {},
  dimanche: {},
};

describe('genererListeCourses', () => {
  it('ajuste les quantites au nombre de personnes et arrondit vers le haut', () => {
    const planning = { ...planningVide, lundi: { midi: { recette: recetteTest } } };
    const items = genererListeCourses(planning, { nb_personnes: 4 });
    // 200g pour 2 portions -> 400g pour 4 personnes -> arrondi a 500g
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ produit: 'Pâtes', quantite: 500, unite: 'g' });
  });

  it('fusionne les doublons entre plusieurs recettes', () => {
    const planning = { ...planningVide, lundi: { midi: { recette: recetteTest } }, mardi: { midi: { recette: recetteTest } } };
    const items = genererListeCourses(planning, { nb_personnes: 2 });
    expect(items).toHaveLength(1);
    expect(items[0]?.quantite).toBe(500); // 200g + 200g = 400g -> arrondi 500g
  });

  it('deduit les stocks deja en frigo', () => {
    const planning = { ...planningVide, lundi: { midi: { recette: recetteTest } } };
    const items = genererListeCourses(planning, { nb_personnes: 2 }, [{ produit: 'Pâtes', quantite: 200, unite: 'g' }]);
    expect(items).toHaveLength(0);
  });

  it('fusionne les synonymes usuels et convertit les cuilleres en volume', () => {
    const recetteAlias: Recette = {
      ...recetteTest,
      id: 'r-alias',
      titre: 'Alias',
      portions: 2,
      ingredients: [
        { nom: 'Œufs', quantite: 2, unite: 'unités', rayon: 'Produits laitiers' },
        { nom: 'Sauce', quantite: 1, unite: 'cs', rayon: 'Epicerie' },
      ],
    };
    const recetteSingulier: Recette = {
      ...recetteAlias,
      id: 'r-singulier',
      ingredients: [
        { nom: 'Oeuf', quantite: 2, unite: 'unite', rayon: 'Produits laitiers' },
        { nom: 'Sauce', quantite: 1, unite: 'cc', rayon: 'Epicerie' },
      ],
    };
    const items = genererListeCourses(
      { ...planningVide, lundi: { midi: { recette: recetteAlias }, soir: { recette: recetteSingulier } } },
      { nb_personnes: 2 },
    );

    expect(items.find((item) => item.produit === 'Œufs')).toMatchObject({ quantite: 4, unite: 'unite' });
    expect(items.find((item) => item.produit === 'Sauce')).toMatchObject({ quantite: 25, unite: 'cl' });
  });

  it('ne fusionne pas un conditionnement avec une unite generique', () => {
    const recetteConditionnements: Recette = {
      ...recetteTest,
      ingredients: [
        { nom: 'Basilic', quantite: 1, unite: 'botte', rayon: 'Fruits & Legumes' },
        { nom: 'Basilic', quantite: 1, unite: 'unite', rayon: 'Fruits & Legumes' },
      ],
    };
    const items = genererListeCourses(
      { ...planningVide, lundi: { midi: { recette: recetteConditionnements } } },
      { nb_personnes: 2 },
    );
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.unite)).toEqual(expect.arrayContaining(['botte', 'unite']));
  });
});
