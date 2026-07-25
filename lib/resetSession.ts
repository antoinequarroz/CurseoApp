/**
 * Vide tous les stores propres a l'utilisateur (deconnexion, suppression de
 * compte). Sans ca, sur un appareil partage, les donnees d'un compte
 * peuvent fuiter vers le compte suivant (coursesStore persiste en
 * AsyncStorage et synchronise vers Supabase par listeId — un listeId de
 * l'ancien utilisateur ecraserait sa liste reelle). Le planning (COUR-27,
 * `repas_planifies`) n'a plus de store local a vider : `queryClient.clear()`
 * suffit, react-query refetchera pour le nouveau profil_id.
 */
import { useProfilStore } from '@/stores/profilStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useCoursesStore } from '@/stores/coursesStore';
import { usePanierStore } from '@/stores/panierStore';
import { queryClient } from '@/lib/queryClient';

export function resetUserStores(): void {
  useProfilStore.getState().reset();
  useOnboardingStore.getState().reset();
  useCoursesStore.getState().reset();
  usePanierStore.getState().reset();
  queryClient.clear();
}
