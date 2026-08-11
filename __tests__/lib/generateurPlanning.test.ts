import { proposerPlanning } from '@/lib/generateurPlanning';
import type { PlanningHebdomadaire, Recette } from '@/types';

const vide: PlanningHebdomadaire = {
  lundi: {}, mardi: {}, mercredi: {}, jeudi: {}, vendredi: {}, samedi: {}, dimanche: {},
};

function recette(id: string): Recette {
  return {
    id, titre: id, description: '', image_url: '', temps_preparation: 20, difficulte: 'facile',
    cout_estime: 8, calories: 400, portions: 2, regime: [], allergenes: [], ingredients: [],
    etapes: [], est_communautaire: false,
  };
}

describe('proposerPlanning', () => {
  it('complète les 14 créneaux midi et soir sans répétition consécutive', () => {
    const resultat = proposerPlanning(vide, [recette('a'), recette('b'), recette('c')]);
    expect(resultat).toHaveLength(14);
    expect(resultat[0]).toMatchObject({ jour: 'lundi', moment: 'midi' });
    expect(resultat[1]).toMatchObject({ jour: 'lundi', moment: 'soir' });
    for (let index = 1; index < resultat.length; index += 1) {
      expect(resultat[index]!.donnees.recette.id).not.toBe(resultat[index - 1]!.donnees.recette.id);
    }
  });

  it('préserve les repas et créneaux explicitement ignorés', () => {
    const planning: PlanningHebdomadaire = {
      ...vide,
      lundi: { midi: { recette: recette('existant') }, soirIgnore: true },
    };
    const resultat = proposerPlanning(planning, [recette('a'), recette('b')]);
    expect(resultat).toHaveLength(12);
    expect(resultat.some((item) => item.jour === 'lundi')).toBe(false);
  });

  it('ne propose rien sans favori', () => {
    expect(proposerPlanning(vide, [])).toEqual([]);
  });
});
