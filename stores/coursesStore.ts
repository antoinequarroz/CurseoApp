/**
 * Liste de courses generee — persistee via AsyncStorage pour rester lisible
 * et cochable hors-ligne (l'utilisateur fait ses courses en magasin, souvent
 * sans connexion fiable). La sync Supabase se fait au retour du reseau.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ItemCourse, PlanningHebdomadaire, Profil } from '@/types';
import { genererListeCourses } from '@/lib/generateurCourses';

interface CoursesState {
  items: ItemCourse[];
  genererDepuisPlanning: (planning: PlanningHebdomadaire, profil: Pick<Profil, 'nb_personnes'>) => void;
  toggleCoche: (id: string) => void;
  reset: () => void;
}

export const useCoursesStore = create<CoursesState>()(
  persist(
    (set) => ({
      items: [],
      genererDepuisPlanning: (planning, profil) =>
        set({ items: genererListeCourses(planning, profil) }),
      toggleCoche: (id) =>
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, coche: !item.coche } : item)),
        })),
      reset: () => set({ items: [] }),
    }),
    { name: 'courseo_courses', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
