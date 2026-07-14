/** React Query : récupération paginée des recettes. En MVP, source = mocks. */
import { useInfiniteQuery } from '@tanstack/react-query';
import { RECETTES_MOCK } from '@/lib/mocks/recettes.mock';
import type { Recette, Regime } from '@/types';

const PAGE_SIZE = 10;

interface FiltresRecettes {
  regime?: Regime[];
}

async function fetchRecettesPage(pageParam: number, filtres: FiltresRecettes): Promise<Recette[]> {
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
    staleTime: 1000 * 60 * 10,
  });
}
