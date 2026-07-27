/**
 * COUR-30 : flux de l'onglet Communauté — RECETTES_MOCK n'est utilise que si
 * Supabase n'est pas configure du tout (dev sans backend), jamais comme
 * repli silencieux (voir hooks/useRecettes.ts, meme convention).
 * Chargement/vide/erreur portes par useQuery, pagination client-side sur un
 * seul fetch (meme choix que useRecettes.ts : flux communautaire reste
 * petit pour l'instant).
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RECETTES_MOCK } from '@/lib/mocks/recettes.mock';
import { fetchRecettesCommunautairesPubliees } from '@/lib/recettesRepository';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { Recette } from '@/types';

const PAGE_SIZE = 10;

export function useRecettesCommunautaires() {
  const source = useQuery({
    queryKey: ['recettes-communautaires-publiees'],
    queryFn: () =>
      isSupabaseConfigured
        ? fetchRecettesCommunautairesPubliees()
        : Promise.resolve(RECETTES_MOCK.filter((r) => r.est_communautaire)),
    staleTime: 1000 * 60 * 5,
  });

  const recettes = useMemo(() => source.data ?? [], [source.data]);
  const [pagesChargees, setPagesChargees] = useState(1);

  const pages = useMemo(() => {
    const resultat: Recette[][] = [];
    for (let i = 0; i < pagesChargees; i++) {
      resultat.push(recettes.slice(i * PAGE_SIZE, (i + 1) * PAGE_SIZE));
    }
    return resultat;
  }, [recettes, pagesChargees]);

  const hasNextPage = pagesChargees * PAGE_SIZE < recettes.length;

  return {
    recettes: pages.flat(),
    total: recettes.length,
    isLoading: source.isLoading,
    isError: source.isError,
    isEmpty: source.isSuccess && recettes.length === 0,
    isRefetching: source.isRefetching,
    refetch: source.refetch,
    fetchNextPage: () => setPagesChargees((p) => p + 1),
    hasNextPage,
  };
}
