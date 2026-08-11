/** Planning hebdomadaire : cache persistant, mutations optimistes et file hors-ligne. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchPlanningSemaine,
  assignerRepas,
  ignorerRepasDate,
  retirerRepasDate,
  type DonneesAssignation,
} from '@/lib/repasPlanifiesRepository';
import { dates } from '@/lib/dates';
import {
  appliquerOperationsPlanning,
  usePlanningOfflineStore,
  type MomentRepas,
  type OperationPlanning,
} from '@/stores/planningOfflineStore';
import type { JourSemaine, PlanningHebdomadaire } from '@/types';

const PLANNING_VIDE: PlanningHebdomadaire = {
  lundi: {}, mardi: {}, mercredi: {}, jeudi: {}, vendredi: {}, samedi: {}, dimanche: {},
};

type IntentionPlanning = Pick<OperationPlanning, 'jour' | 'moment' | 'action' | 'donnees'>;

function estPlanningVide(planning: PlanningHebdomadaire): boolean {
  return Object.values(planning).every((jour) => !jour.midi && !jour.soir && !jour.midiIgnore && !jour.soirIgnore);
}

function operationInverse(planning: PlanningHebdomadaire, intention: IntentionPlanning): IntentionPlanning {
  const repasJour = planning[intention.jour];
  const repas = repasJour[intention.moment];
  const ignore = repasJour[`${intention.moment}Ignore`];
  if (repas) return { jour: intention.jour, moment: intention.moment, action: 'assigner', donnees: repas };
  if (ignore) return { jour: intention.jour, moment: intention.moment, action: 'ignorer' };
  return { jour: intention.jour, moment: intention.moment, action: 'retirer' };
}

async function executerSurServeur(
  profilId: string,
  semaineDebut: Date,
  intention: IntentionPlanning,
): Promise<void> {
  const dateISO = dates.versISO(dates.dateDuJour(semaineDebut, intention.jour));
  if (intention.action === 'assigner' && intention.donnees) {
    await assignerRepas(profilId, dateISO, intention.moment, intention.donnees);
  } else if (intention.action === 'ignorer') {
    await ignorerRepasDate(profilId, dateISO, intention.moment);
  } else {
    await retirerRepasDate(profilId, dateISO, intention.moment);
  }
}

export function useRepasSemaine(
  profilId: string | undefined,
  semaineDebut: Date,
  estHorsLigne = false,
) {
  const semaineISO = dates.versISO(semaineDebut);
  const queryKey = useMemo(() => ['repas-semaine', profilId, semaineISO] as const, [profilId, semaineISO]);
  const client = useQueryClient();
  const operations = usePlanningOfflineStore((state) => state.operations);
  const ajouterOperation = usePlanningOfflineStore((state) => state.ajouter);
  const retirerOperation = usePlanningOfflineStore((state) => state.retirer);
  const synchronisationEnCours = useRef(false);
  const [mutationEnCours, setMutationEnCours] = useState(false);
  const [derniereAnnulation, setDerniereAnnulation] = useState<IntentionPlanning[] | null>(null);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchPlanningSemaine(profilId as string, semaineDebut),
    enabled: Boolean(profilId),
  });

  const operationsSemaine = useMemo(
    () => operations.filter((operation) => operation.profilId === profilId && operation.semaineISO === semaineISO),
    [operations, profilId, semaineISO],
  );
  const planning = useMemo(
    () => appliquerOperationsPlanning(query.data ?? PLANNING_VIDE, operationsSemaine),
    [operationsSemaine, query.data],
  );

  const mettreEnFile = (intention: IntentionPlanning) => {
    if (!profilId) return;
    ajouterOperation({ ...intention, profilId, semaineISO });
  };

  const executerLot = async (intentions: IntentionPlanning[], memoriserAnnulation = true) => {
    if (!profilId || intentions.length === 0) return;
    setMutationEnCours(true);
    let planningOptimiste = planning;
    const inverses: IntentionPlanning[] = [];
    for (const intention of intentions) {
      inverses.unshift(operationInverse(planningOptimiste, intention));
      planningOptimiste = appliquerOperationsPlanning(planningOptimiste, [
        { ...intention, id: 'optimiste', profilId, semaineISO, creeeLe: Date.now() },
      ]);
    }
    client.setQueryData(queryKey, planningOptimiste);
    if (memoriserAnnulation) setDerniereAnnulation(inverses);

    try {
      if (estHorsLigne) {
        intentions.forEach(mettreEnFile);
        return;
      }
      for (let index = 0; index < intentions.length; index += 1) {
        try {
          await executerSurServeur(profilId, semaineDebut, intentions[index]!);
        } catch {
          // Une coupure peut arriver entre deux opérations : la suite reste
          // locale et sera reprise automatiquement sans perdre le planning.
          intentions.slice(index).forEach(mettreEnFile);
          return;
        }
      }
      await query.refetch();
    } finally {
      setMutationEnCours(false);
    }
  };

  // Dès que le réseau revient, rejoue les intentions dans leur ordre puis
  // recharge les semaines concernées. Une opération n'est retirée qu'après
  // confirmation du serveur.
  useEffect(() => {
    if (estHorsLigne || !profilId || synchronisationEnCours.current) return;
    const aSynchroniser = operations.filter((operation) => operation.profilId === profilId);
    if (aSynchroniser.length === 0) return;
    synchronisationEnCours.current = true;
    void (async () => {
      const semainesModifiees = new Set<string>();
      for (const operation of aSynchroniser) {
        try {
          await executerSurServeur(profilId, new Date(`${operation.semaineISO}T12:00:00`), operation);
          retirerOperation(operation.id);
          semainesModifiees.add(operation.semaineISO);
        } catch {
          break;
        }
      }
      await Promise.all(
        [...semainesModifiees].map((semaine) =>
          client.invalidateQueries({ queryKey: ['repas-semaine', profilId, semaine] }),
        ),
      );
      synchronisationEnCours.current = false;
    })();
  }, [client, estHorsLigne, operations, profilId, retirerOperation]);

  const assigner = (jour: JourSemaine, moment: MomentRepas, donnees: DonneesAssignation) =>
    executerLot([{ jour, moment, action: 'assigner', donnees }]);
  const ignorer = (jour: JourSemaine, moment: MomentRepas) =>
    executerLot([{ jour, moment, action: 'ignorer' }]);
  const retirer = (jour: JourSemaine, moment: MomentRepas) =>
    executerLot([{ jour, moment, action: 'retirer' }]);
  const assignerPlusieurs = (assignations: { jour: JourSemaine; moment: MomentRepas; donnees: DonneesAssignation }[]) =>
    executerLot(assignations.map((item) => ({ ...item, action: 'assigner' as const })));
  const annulerDerniereAction = async () => {
    if (!derniereAnnulation) return;
    const inverse = derniereAnnulation;
    setDerniereAnnulation(null);
    await executerLot(inverse, false);
  };

  return {
    planning,
    isLoading: query.isLoading,
    isError: query.isError,
    isEmpty: query.isSuccess && estPlanningVide(planning),
    isRefetching: query.isRefetching,
    isPaused: query.fetchStatus === 'paused',
    hasCachedData: query.data !== undefined,
    refetch: query.refetch,
    mutationEnCours,
    synchronisationsEnAttente: operationsSemaine.length,
    peutAnnuler: Boolean(derniereAnnulation),
    assigner,
    assignerPlusieurs,
    ignorer,
    retirer,
    annulerDerniereAction,
  };
}
