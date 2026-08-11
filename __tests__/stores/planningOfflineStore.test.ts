import { appliquerOperationsPlanning, usePlanningOfflineStore } from '@/stores/planningOfflineStore';
import type { PlanningHebdomadaire, Recette } from '@/types';

const vide: PlanningHebdomadaire = {
  lundi: {}, mardi: {}, mercredi: {}, jeudi: {}, vendredi: {}, samedi: {}, dimanche: {},
};
const recette: Recette = {
  id: 'r-1', titre: 'Test', description: '', image_url: '', temps_preparation: 10,
  difficulte: 'facile', cout_estime: 5, calories: 300, portions: 2, regime: [], allergenes: [],
  ingredients: [], etapes: [], est_communautaire: false,
};

describe('planningOfflineStore', () => {
  beforeEach(() => usePlanningOfflineStore.getState().reset());

  it('garde seulement la dernière intention d’un même créneau', () => {
    const commun = { profilId: 'u-1', semaineISO: '2026-08-10', jour: 'lundi' as const, moment: 'midi' as const };
    usePlanningOfflineStore.getState().ajouter({ ...commun, action: 'assigner', donnees: { recette } });
    usePlanningOfflineStore.getState().ajouter({ ...commun, action: 'retirer' });
    expect(usePlanningOfflineStore.getState().operations).toHaveLength(1);
    expect(usePlanningOfflineStore.getState().operations[0]?.action).toBe('retirer');
  });

  it('superpose assignation, ignore et retrait au cache serveur', () => {
    const base = { ...vide, mardi: { midi: { recette } } };
    const resultat = appliquerOperationsPlanning(base, [
      { id: '1', creeeLe: 1, profilId: 'u', semaineISO: '2026-08-10', jour: 'lundi', moment: 'soir', action: 'assigner', donnees: { recette } },
      { id: '2', creeeLe: 2, profilId: 'u', semaineISO: '2026-08-10', jour: 'mardi', moment: 'midi', action: 'retirer' },
      { id: '3', creeeLe: 3, profilId: 'u', semaineISO: '2026-08-10', jour: 'dimanche', moment: 'soir', action: 'ignorer' },
    ]);
    expect(resultat.lundi.soir?.recette.id).toBe('r-1');
    expect(resultat.mardi.midi).toBeUndefined();
    expect(resultat.dimanche.soirIgnore).toBe(true);
  });
});
