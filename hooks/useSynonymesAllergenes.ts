/**
 * COUR-22/25 : referentiel de synonymes d'allergenes, figé pour la session
 * (staleTime infini — un seul fetch, jamais un appel par allergie). Partagé
 * entre useRecettes (contraintes du profil) et useCompatibiliteMembres
 * (contraintes des membres sélectionnés pour un repas, COUR-25) — react-query
 * dédoublonne la requête réseau grâce à la queryKey commune.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSynonymesAllergenes, type SynonymeAllergene } from '@/lib/allergenesRepository';
import { normaliserAllergie } from '@/lib/compatibiliteRecette';
import { isSupabaseConfigured } from '@/lib/supabase';

export function useSynonymesAllergenes(enabled = true): Map<string, string> | null {
  const query = useQuery({
    queryKey: ['synonymes-allergenes'],
    queryFn: (): Promise<SynonymeAllergene[]> => (isSupabaseConfigured ? fetchSynonymesAllergenes() : Promise.resolve([])),
    enabled: enabled && isSupabaseConfigured,
    staleTime: Infinity,
  });

  return useMemo(() => {
    if (!isSupabaseConfigured || !enabled) return null;
    const map = new Map<string, string>();
    for (const s of query.data ?? []) map.set(normaliserAllergie(s.terme), s.code);
    return map;
  }, [enabled, query.data]);
}
