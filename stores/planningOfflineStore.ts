import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { DonneesAssignation } from '@/lib/repasPlanifiesRepository';
import type { JourSemaine, PlanningHebdomadaire } from '@/types';

export type MomentRepas = 'midi' | 'soir';

export type OperationPlanning = {
  id: string;
  profilId: string;
  semaineISO: string;
  jour: JourSemaine;
  moment: MomentRepas;
  action: 'assigner' | 'ignorer' | 'retirer';
  donnees?: DonneesAssignation;
  creeeLe: number;
};

interface PlanningOfflineState {
  operations: OperationPlanning[];
  ajouter: (operation: Omit<OperationPlanning, 'id' | 'creeeLe'>) => void;
  retirer: (id: string) => void;
  viderProfil: (profilId: string) => void;
  reset: () => void;
}

function nouvelId(): string {
  return `planning-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

export const usePlanningOfflineStore = create<PlanningOfflineState>()(
  persist(
    (set) => ({
      operations: [],
      ajouter: (operation) =>
        set((state) => ({
          // Une seule intention finale par créneau : remplacer trois fois un
          // dîner hors ligne ne doit synchroniser que le dernier choix.
          operations: [
            ...state.operations.filter(
              (candidate) =>
                candidate.profilId !== operation.profilId ||
                candidate.semaineISO !== operation.semaineISO ||
                candidate.jour !== operation.jour ||
                candidate.moment !== operation.moment,
            ),
            { ...operation, id: nouvelId(), creeeLe: Date.now() },
          ],
        })),
      retirer: (id) => set((state) => ({ operations: state.operations.filter((operation) => operation.id !== id) })),
      viderProfil: (profilId) =>
        set((state) => ({ operations: state.operations.filter((operation) => operation.profilId !== profilId) })),
      reset: () => set({ operations: [] }),
    }),
    {
      name: 'coursia_planning_pending_v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ operations: state.operations }),
    },
  ),
);

/** Superpose les intentions locales au dernier planning connu du serveur. */
export function appliquerOperationsPlanning(
  planning: PlanningHebdomadaire,
  operations: readonly OperationPlanning[],
): PlanningHebdomadaire {
  const resultat: PlanningHebdomadaire = {
    lundi: { ...planning.lundi },
    mardi: { ...planning.mardi },
    mercredi: { ...planning.mercredi },
    jeudi: { ...planning.jeudi },
    vendredi: { ...planning.vendredi },
    samedi: { ...planning.samedi },
    dimanche: { ...planning.dimanche },
  };

  for (const operation of operations) {
    const jour = resultat[operation.jour];
    const ignoreKey = `${operation.moment}Ignore` as const;
    if (operation.action === 'assigner' && operation.donnees) {
      jour[operation.moment] = operation.donnees;
      jour[ignoreKey] = false;
    } else if (operation.action === 'ignorer') {
      delete jour[operation.moment];
      jour[ignoreKey] = true;
    } else if (operation.action === 'retirer') {
      delete jour[operation.moment];
      delete jour[ignoreKey];
    }
  }
  return resultat;
}
