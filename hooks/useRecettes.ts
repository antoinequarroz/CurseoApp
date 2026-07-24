/**
 * React Query : récupération paginée des recettes. Source réelle
 * (Supabase, recettes publiées — COUR-18) si le backend est configuré et
 * répond avec au moins une recette ; sinon repli sur RECETTES_MOCK (dev
 * sans backend, ou catalogue distant momentanément vide).
 */
import { useInfiniteQuery } from '@tanstack/react-query';
import { RECETTES_MOCK } from '@/lib/mocks/recettes.mock';
import { fetchRecettesPubliees } from '@/lib/recettesRepository';
import { isSupabaseConfigured } from '@/lib/supabase';
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

// Cache memoire simple, partage entre tous les appels de useRecettes : evite
// de refaire l'appel reseau a chaque page paginee (le catalogue ne change
// pas pendant une session).
let sourcePromise: Promise<Recette[]> | null = null;
function obtenirSourceRecettes(): Promise<Recette[]> {
  if (!sourcePromise) {
    sourcePromise = isSupabaseConfigured
      ? fetchRecettesPubliees()
          .then((reelles) => (reelles.length > 0 ? reelles : RECETTES_MOCK))
          .catch(() => RECETTES_MOCK)
      : Promise.resolve(RECETTES_MOCK);
  }
  return sourcePromise;
}

async function fetchRecettesPage(pageParam: number, filtres: FiltresRecettes): Promise<Recette[]> {
  const source = await obtenirSourceRecettes();

  let filtrees = filtres.regime?.length
    ? source.filter((r) => filtres.regime!.some((reg) => r.regime.includes(reg)))
    : source;

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
