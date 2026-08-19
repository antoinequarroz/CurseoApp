/**
 * Liste de courses generee — persistee via AsyncStorage pour rester lisible
 * et cochable hors-ligne (l'utilisateur fait ses courses en magasin, souvent
 * sans connexion fiable). La sync Supabase se fait au retour du reseau via
 * `syncerAvecSupabase`, appelee par `hooks/useCoursesSync.ts`.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ItemCourse, PlanningHebdomadaire, Profil, Rayon } from '@/types';
import { cleItemCourse, genererListeCourses } from '@/lib/generateurCourses';
import {
  chargerDerniereListeCourses,
  enregistrerListeCourses,
} from '@/lib/coursesRepository';

interface CoursesState {
  items: ItemCourse[];
  listeId: string | null;
  planningId: string | null;
  syncEnAttente: boolean;
  syncing: boolean;
  erreurSynchronisation: boolean;
  revision: number;
  cycleSession: number;
  genererDepuisPlanning: (planning: PlanningHebdomadaire, profil: Pick<Profil, 'nb_personnes'>, planningId?: string) => void;
  toggleCoche: (id: string) => void;
  /** Ajoute un article libre (pas issu d'une recette) : fruits du dejeuner, papier toilette, etc. */
  ajouterItemLibre: (produit: string, rayon: Rayon, quantite?: number, unite?: string) => void;
  retirerItem: (id: string) => void;
  reset: () => void;
  chargerDepuisSupabase: (profilId: string) => Promise<boolean>;
  syncerAvecSupabase: (profilId: string) => Promise<boolean>;
}

export const useCoursesStore = create<CoursesState>()(
  persist(
    (set, get) => ({
      items: [],
      listeId: null,
      planningId: null,
      syncEnAttente: false,
      syncing: false,
      erreurSynchronisation: false,
      revision: 0,
      cycleSession: 0,
      genererDepuisPlanning: (planning, profil, planningId) =>
        set((state) => {
          const etatParCle = new Map(
            state.items
              .filter((item) => Boolean(item.recette_origine))
              .map((item) => [cleItemCourse(item), item] as const),
          );
          const generes = genererListeCourses(planning, profil).map((item) => {
            const precedent = etatParCle.get(cleItemCourse(item));
            return precedent ? { ...item, coche: precedent.coche } : item;
          });

          return {
            // Les articles libres (sans recette_origine) sont preserves lors d'une
            // regeneration — sinon la liste "papier toilette / yogourts" ajoutee a
            // la main disparaitrait des qu'on re-planifie la semaine.
            items: [...generes, ...state.items.filter((i) => !i.recette_origine)],
            planningId: planningId ?? get().planningId,
            syncEnAttente: true,
            erreurSynchronisation: false,
            revision: state.revision + 1,
          };
        }),
      toggleCoche: (id) =>
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, coche: !item.coche } : item)),
          syncEnAttente: true,
          erreurSynchronisation: false,
          revision: state.revision + 1,
        })),
      ajouterItemLibre: (produit, rayon, quantite = 1, unite = 'unite') =>
        set((state) => ({
          items: [
            ...state.items,
            {
              id: `libre-${Date.now()}-${Math.round(Math.random() * 1000)}`,
              produit,
              quantite,
              unite,
              rayon,
              coche: false,
            },
          ],
          syncEnAttente: true,
          erreurSynchronisation: false,
          revision: state.revision + 1,
        })),
      retirerItem: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
          syncEnAttente: true,
          erreurSynchronisation: false,
          revision: state.revision + 1,
        })),
      reset: () => set((state) => ({
        items: [],
        listeId: null,
        planningId: null,
        syncEnAttente: false,
        syncing: false,
        erreurSynchronisation: false,
        revision: 0,
        // Invalide les réponses réseau encore en vol au moment d'une
        // déconnexion afin qu'elles ne contaminent pas le compte suivant.
        cycleSession: state.cycleSession + 1,
      })),
      chargerDepuisSupabase: async (profilId) => {
        const depart = get();
        if (depart.syncing || depart.syncEnAttente || depart.listeId || depart.items.length > 0) {
          return true;
        }

        const revisionAuDepart = depart.revision;
        const cycleAuDepart = depart.cycleSession;
        set({ syncing: true, erreurSynchronisation: false });
        try {
          const distante = await chargerDerniereListeCourses(profilId);
          const courant = get();
          if (courant.cycleSession !== cycleAuDepart) return false;
          // Une action locale effectuée pendant le chargement reste prioritaire.
          if (courant.revision === revisionAuDepart && !courant.syncEnAttente && distante) {
            set({
              items: distante.items,
              listeId: distante.id,
              planningId: distante.planningId,
            });
          }
          return true;
        } catch {
          if (get().cycleSession === cycleAuDepart) set({ erreurSynchronisation: true });
          return false;
        } finally {
          if (get().cycleSession === cycleAuDepart) set({ syncing: false });
        }
      },
      syncerAvecSupabase: async (profilId) => {
        const depart = get();
        if (depart.syncing || !depart.syncEnAttente) return true;

        // Une liste créée puis entièrement supprimée avant son premier envoi
        // n'a rien à créer sur le serveur.
        if (!depart.listeId && depart.items.length === 0) {
          set({ syncEnAttente: false, erreurSynchronisation: false });
          return true;
        }

        const revisionEnvoyee = depart.revision;
        const cycleAuDepart = depart.cycleSession;
        set({ syncing: true, erreurSynchronisation: false });
        try {
          const listeId = await enregistrerListeCourses({
            profilId,
            listeId: depart.listeId,
            planningId: depart.planningId,
            items: depart.items,
          });
          if (get().cycleSession !== cycleAuDepart) return false;
          set((courant) => ({
            listeId,
            // Une modification arrivée pendant la requête déclenche un second
            // envoi au lieu d'être marquée à tort comme synchronisée.
            syncEnAttente: courant.revision !== revisionEnvoyee,
            erreurSynchronisation: false,
          }));
          return true;
        } catch {
          if (get().cycleSession === cycleAuDepart) set({ erreurSynchronisation: true });
          return false;
        } finally {
          if (get().cycleSession === cycleAuDepart) set({ syncing: false });
        }
      },
    }),
    {
      name: 'coursia_courses',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        items: state.items,
        listeId: state.listeId,
        planningId: state.planningId,
        syncEnAttente: state.syncEnAttente,
        revision: state.revision,
      }),
    },
  ),
);
