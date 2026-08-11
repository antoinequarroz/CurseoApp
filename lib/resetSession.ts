/**
 * Vide tous les stores propres a l'utilisateur (deconnexion, suppression de
 * compte). Sans ca, sur un appareil partage, les donnees d'un compte
 * peuvent fuiter vers le compte suivant (coursesStore persiste en
 * AsyncStorage et synchronise vers Supabase par listeId — un listeId de
 * l'ancien utilisateur ecraserait sa liste reelle). Le cache de lecture et
 * la file de synchronisation du planning sont eux aussi propres au compte.
 */
import { useProfilStore } from '@/stores/profilStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useCoursesStore } from '@/stores/coursesStore';
import { useGoutsStore } from '@/stores/goutsStore';
import { usePanierStore } from '@/stores/panierStore';
import { usePlanningOfflineStore } from '@/stores/planningOfflineStore';
import { queryClient } from '@/lib/queryClient';
import { queryPersister } from '@/lib/queryPersistence';

export function resetUserStores(): void {
  useProfilStore.getState().reset();
  useOnboardingStore.getState().reset();
  useCoursesStore.getState().reset();
  useGoutsStore.getState().reset();
  usePanierStore.getState().reset();
  usePlanningOfflineStore.getState().reset();
  queryClient.clear();
  void queryPersister.removeClient();
}
