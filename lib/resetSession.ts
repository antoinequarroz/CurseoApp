/**
 * Vide tous les stores propres a l'utilisateur (deconnexion, suppression de
 * compte). Sans ca, sur un appareil partage, les donnees d'un compte
 * peuvent fuiter vers le compte suivant (coursesStore/planningStore
 * persistent en AsyncStorage et coursesStore synchronise vers Supabase par
 * listeId — un listeId de l'ancien utilisateur ecraserait sa liste reelle).
 */
import { useProfilStore } from '@/stores/profilStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useCoursesStore } from '@/stores/coursesStore';
import { usePlanningStore } from '@/stores/planningStore';
import { usePanierStore } from '@/stores/panierStore';
import { queryClient } from '@/lib/queryClient';

export function resetUserStores(): void {
  useProfilStore.getState().reset();
  useOnboardingStore.getState().reset();
  useCoursesStore.getState().reset();
  usePlanningStore.getState().reset();
  usePanierStore.getState().reset();
  queryClient.clear();
}
