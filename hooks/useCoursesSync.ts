/**
 * Synchronise la liste de courses locale avec Supabase des que le reseau
 * revient et a chaque modification (coche, generation) tant qu'on est en ligne.
 * Le store reste la source de verite hors-ligne ; ce hook ne fait que pousser.
 */
import { useEffect, useRef } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { useCoursesStore } from '@/stores/coursesStore';
import { useProfilStore } from '@/stores/profilStore';

export function useCoursesSync() {
  const { estConnecte } = useNetworkStatus();
  const profilId = useProfilStore((s) => s.profil?.id);
  const syncEnAttente = useCoursesStore((s) => s.syncEnAttente);
  const syncerAvecSupabase = useCoursesStore((s) => s.syncerAvecSupabase);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!estConnecte || !profilId || !syncEnAttente) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void syncerAvecSupabase(profilId);
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [estConnecte, profilId, syncEnAttente, syncerAvecSupabase]);
}
