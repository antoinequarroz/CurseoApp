/** React Query : recuperation paginee des recettes. En mode MVP, source = mocks (structure identique a une vraie table Supabase). */
import { useInfiniteQuery } from '@tanstack/react-query';
import { RECETTES_MOCK } from '@/lib/mocks/recettes.mock';
import type { Recette, Regime } from '@/types';

const PAGE_SIZE = 10;

interface FiltresRecettes {
  regime?: Regime[];
}

async function fetchRecettesPage(pageParam: number, filtres: FiltresRecettes): Promise<Recette[]> {
  // Simule la latence reseau — a remplacer par supabase.from('recettes').select() en Phase 2.
  await new Promise((resolve) => setTimeout(resolve, 200));

  const filtrees = filtres.regime?.length
    ? RECETTES_MOCK.filter((r) => filtres.regime!.some((reg) => r.regime.includes(reg)))
    : RECETTES_MOCK;

  return filtrees.slice(pageParam, pageParam + PAGE_SIZE);
}

export function useRecettes(filtres: FiltresRecettes = {}) {
  return useInfiniteQuery({
    queryKey: ['recettes', filtres],
    queryFn: ({ pageParam }) => fetchRecettesPage(pageParam, filtres),
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === PAGE_SIZE ? pages.length * PAGE_SIZE : undefined,
    initialPageParam: 0,
  });
}
