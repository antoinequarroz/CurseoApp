/**
 * Synchronise la liste de courses locale avec Supabase des que le reseau
 * revient et a chaque modification (coche, generation) tant qu'on est en ligne.
 * Le store reste la source de verite hors-ligne ; ce hook ne fait que pousser.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { useCoursesStore } from '@/stores/coursesStore';
import { useProfilStore } from '@/stores/profilStore';

export function useCoursesSync() {
  const { estConnecte } = useNetworkStatus();
  const profilId = useProfilStore((s) => s.profil?.id);
  const syncEnAttente = useCoursesStore((s) => s.syncEnAttente);
  const syncing = useCoursesStore((s) => s.syncing);
  const erreurSynchronisation = useCoursesStore((s) => s.erreurSynchronisation);
  const chargerDepuisSupabase = useCoursesStore((s) => s.chargerDepuisSupabase);
  const syncerAvecSupabase = useCoursesStore((s) => s.syncerAvecSupabase);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profilChargeRef = useRef<string | null>(null);
  const connexionPrecedenteRef = useRef(estConnecte);
  const [hydrated, setHydrated] = useState(useCoursesStore.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) return;
    return useCoursesStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  useEffect(() => {
    profilChargeRef.current = null;
  }, [profilId]);

  useEffect(() => {
    if (
      !hydrated ||
      !estConnecte ||
      !profilId ||
      syncEnAttente ||
      syncing ||
      erreurSynchronisation ||
      profilChargeRef.current === profilId
    ) return;

    profilChargeRef.current = profilId;
    void chargerDepuisSupabase(profilId).then((reussi) => {
      if (!reussi) profilChargeRef.current = null;
    });
  }, [
    chargerDepuisSupabase,
    erreurSynchronisation,
    estConnecte,
    hydrated,
    profilId,
    syncEnAttente,
    syncing,
  ]);

  useEffect(() => {
    if (!hydrated || !estConnecte || !profilId || !syncEnAttente || syncing || erreurSynchronisation) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void syncerAvecSupabase(profilId);
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [erreurSynchronisation, estConnecte, hydrated, profilId, syncEnAttente, syncerAvecSupabase, syncing]);

  const reessayer = useCallback(() => {
    if (!estConnecte || !profilId || syncing) return;
    if (syncEnAttente) {
      void syncerAvecSupabase(profilId);
    } else {
      profilChargeRef.current = profilId;
      void chargerDepuisSupabase(profilId).then((reussi) => {
        if (!reussi) profilChargeRef.current = null;
      });
    }
  }, [chargerDepuisSupabase, estConnecte, profilId, syncEnAttente, syncerAvecSupabase, syncing]);

  useEffect(() => {
    const vientDeRevenirEnLigne = !connexionPrecedenteRef.current && estConnecte;
    connexionPrecedenteRef.current = estConnecte;
    if (vientDeRevenirEnLigne && erreurSynchronisation) reessayer();
  }, [erreurSynchronisation, estConnecte, reessayer]);

  return {
    estConnecte,
    syncing,
    syncEnAttente,
    erreurSynchronisation,
    reessayer,
  };
}
