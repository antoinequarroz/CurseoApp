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
import { genererListeCourses } from '@/lib/generateurCourses';
import { supabase } from '@/lib/supabase';

interface CoursesState {
  items: ItemCourse[];
  listeId: string | null;
  planningId: string | null;
  syncEnAttente: boolean;
  syncing: boolean;
  genererDepuisPlanning: (planning: PlanningHebdomadaire, profil: Pick<Profil, 'nb_personnes'>, planningId?: string) => void;
  toggleCoche: (id: string) => void;
  /** Ajoute un article libre (pas issu d'une recette) : fruits du dejeuner, papier toilette, etc. */
  ajouterItemLibre: (produit: string, rayon: Rayon, quantite?: number, unite?: string) => void;
  retirerItem: (id: string) => void;
  reset: () => void;
  syncerAvecSupabase: (profilId: string) => Promise<void>;
}

export const useCoursesStore = create<CoursesState>()(
  persist(
    (set, get) => ({
      items: [],
      listeId: null,
      planningId: null,
      syncEnAttente: false,
      syncing: false,
      genererDepuisPlanning: (planning, profil, planningId) =>
        set((state) => ({
          // Les articles libres (sans recette_origine) sont preserves lors d'une
          // regeneration — sinon la liste "papier toilette / yogourts" ajoutee a
          // la main disparaitrait des qu'on re-planifie la semaine.
          items: [...genererListeCourses(planning, profil), ...state.items.filter((i) => !i.recette_origine)],
          planningId: planningId ?? get().planningId,
          syncEnAttente: true,
        })),
      toggleCoche: (id) =>
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, coche: !item.coche } : item)),
          syncEnAttente: true,
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
        })),
      retirerItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id), syncEnAttente: true })),
      reset: () => set({ items: [], listeId: null, planningId: null, syncEnAttente: false }),
      syncerAvecSupabase: async (profilId) => {
        const { items, listeId, planningId, syncing } = get();
        if (syncing || items.length === 0) return;
        set({ syncing: true });
        try {
          if (listeId) {
            const { error } = await supabase.from('listes_courses').update({ items }).eq('id', listeId);
            if (error) throw error;
          } else {
            const { data, error } = await supabase
              .from('listes_courses')
              .insert({ profil_id: profilId, planning_id: planningId, items })
              .select('id')
              .single();
            if (error) throw error;
            set({ listeId: (data as { id: string }).id });
          }
          set({ syncEnAttente: false });
        } catch {
          // Reste en attente : reessaie au prochain retour reseau/mutation.
        } finally {
          set({ syncing: false });
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
      }),
    },
  ),
);
