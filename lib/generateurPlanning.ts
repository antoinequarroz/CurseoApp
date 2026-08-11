import type { DonneesAssignation } from '@/lib/repasPlanifiesRepository';
import { JOURS_SEMAINE, type JourSemaine, type PlanningHebdomadaire, type Recette } from '@/types';

export interface AssignationPlanning {
  jour: JourSemaine;
  moment: 'midi' | 'soir';
  donnees: DonneesAssignation;
}

/**
 * Complète tous les créneaux ouverts, midi puis soir. Le choix privilégie la
 * recette la moins utilisée et évite deux repas identiques à la suite dès
 * qu'au moins deux favoris sont disponibles.
 */
export function proposerPlanning(
  planning: PlanningHebdomadaire,
  favoris: readonly Recette[],
): AssignationPlanning[] {
  if (favoris.length === 0) return [];
  const utilisations = new Map(favoris.map((recette) => [recette.id, 0]));
  for (const jour of JOURS_SEMAINE) {
    for (const moment of ['midi', 'soir'] as const) {
      const id = planning[jour][moment]?.recette.id;
      if (id && utilisations.has(id)) utilisations.set(id, (utilisations.get(id) ?? 0) + 1);
    }
  }

  const resultat: AssignationPlanning[] = [];
  let precedente: string | undefined;
  for (const jour of JOURS_SEMAINE) {
    for (const moment of ['midi', 'soir'] as const) {
      const repas = planning[jour];
      if (repas[moment] || repas[`${moment}Ignore`]) {
        precedente = repas[moment]?.recette.id ?? precedente;
        continue;
      }
      const candidates = [...favoris].sort((a, b) => {
        const repetitionA = a.id === precedente ? 1 : 0;
        const repetitionB = b.id === precedente ? 1 : 0;
        return repetitionA - repetitionB || (utilisations.get(a.id) ?? 0) - (utilisations.get(b.id) ?? 0);
      });
      const recette = candidates[0]!;
      resultat.push({ jour, moment, donnees: { recette } });
      utilisations.set(recette.id, (utilisations.get(recette.id) ?? 0) + 1);
      precedente = recette.id;
    }
  }
  return resultat;
}
