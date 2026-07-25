/**
 * COUR-27 : planning d'UNE semaine donnee (Supabase, `repas_planifies`).
 * Chaque semaine a sa propre entree de cache react-query (queryKey incluant
 * la date ISO du lundi) : changer de semaine ne "melange" jamais les repas
 * d'une autre — c'est une requete/un cache distinct, pas un objet partage
 * mute sur place. Meme convention de mutation que useMembresFoyer.ts
 * (fonctions async + refetch, pas useMutation/invalidateQueries).
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchPlanningSemaine,
  assignerRepas,
  ignorerRepasDate,
  retirerRepasDate,
  type DonneesAssignation,
} from '@/lib/repasPlanifiesRepository';
import { dates } from '@/lib/dates';
import type { JourSemaine, PlanningHebdomadaire } from '@/types';

const PLANNING_VIDE: PlanningHebdomadaire = {
  lundi: {},
  mardi: {},
  mercredi: {},
  jeudi: {},
  vendredi: {},
  samedi: {},
  dimanche: {},
};

function estPlanningVide(planning: PlanningHebdomadaire): boolean {
  return Object.values(planning).every((jour) => !jour.midi && !jour.soir && !jour.midiIgnore && !jour.soirIgnore);
}

export function useRepasSemaine(profilId: string | undefined, semaineDebut: Date) {
  const semaineISO = dates.versISO(semaineDebut);

  const query = useQuery({
    queryKey: ['repas-semaine', profilId, semaineISO],
    queryFn: () => fetchPlanningSemaine(profilId as string, semaineDebut),
    enabled: Boolean(profilId),
  });

  const [mutationEnCours, setMutationEnCours] = useState(false);

  const executerMutation = async (action: (dateISO: string) => Promise<void>, jour: JourSemaine) => {
    if (!profilId) return;
    setMutationEnCours(true);
    try {
      await action(dates.versISO(dates.dateDuJour(semaineDebut, jour)));
      await query.refetch();
    } finally {
      setMutationEnCours(false);
    }
  };

  const assigner = (jour: JourSemaine, moment: 'midi' | 'soir', donnees: DonneesAssignation) =>
    executerMutation((dateISO) => assignerRepas(profilId as string, dateISO, moment, donnees), jour);

  const ignorer = (jour: JourSemaine, moment: 'midi' | 'soir') =>
    executerMutation((dateISO) => ignorerRepasDate(profilId as string, dateISO, moment), jour);

  const retirer = (jour: JourSemaine, moment: 'midi' | 'soir') =>
    executerMutation((dateISO) => retirerRepasDate(profilId as string, dateISO, moment), jour);

  const planning = query.data ?? PLANNING_VIDE;

  return {
    planning,
    isLoading: query.isLoading,
    isError: query.isError,
    isEmpty: query.isSuccess && estPlanningVide(planning),
    refetch: query.refetch,
    mutationEnCours,
    assigner,
    ignorer,
    retirer,
  };
}
