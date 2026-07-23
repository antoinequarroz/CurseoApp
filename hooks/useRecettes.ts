/** React Query : récupération paginée des recettes. En MVP, source = mocks. */
import { useInfiniteQuery } from '@tanstack/react-query';
import { RECETTES_MOCK } from '@/lib/mocks/recettes.mock';
import type { Recette, Regime } from '@/types';

const PAGE_SIZE = 10;

interface FiltresRecettes {
  regime?: Regime[];
  allergies?: string[];
}

/** Normalise pour une comparaison tolerante (accents, casse, espaces) entre l'allergie saisie librement et les allergenes tagues sur les recettes. */
function normaliserAllergie(v: string): string {
  return v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

async function fetchRecettesPage(pageParam: number, filtres: FiltresRecettes): Promise<Recette[]> {
  let filtrees = filtres.regime?.length
    ? RECETTES_MOCK.filter((r) => filtres.regime!.some((reg) => r.regime.includes(reg)))
    : RECETTES_MOCK;

  if (filtres.allergies?.length) {
    const allergiesNormalisees = filtres.allergies.map(normaliserAllergie);
    filtrees = filtrees.filter(
      (r) => !r.allergenes.some((a) => allergiesNormalisees.includes(normaliserAllergie(a))),
    );
  }

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
