import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRecettes } from '@/hooks/useRecettes';
import * as recettesRepository from '@/lib/recettesRepository';
import type { Recette } from '@/types';

jest.mock('@/lib/recettesRepository');
// Force isSupabaseConfigured=true pour ce fichier : ces tests couvrent le
// vrai parcours "backend joignable" (succes/vide/erreur/refetch/filtres).
// Le cas "Supabase non configure -> repli sur RECETTES_MOCK" est teste a
// part, dans useRecettes.sansSupabase.test.tsx, qui laisse le vrai module
// (isSupabaseConfigured=false par defaut en environnement de test, aucune
// config Expo chargee) plutot que de tenter de faire varier ce booleen
// dans un seul fichier — un booleen expose comme const, pas comme
// fonction/module mockable proprement, n'est pas fiable a faire varier au
// sein d'un meme fichier de tests avec le hoisting de jest.mock.
jest.mock('@/lib/supabase', () => ({
  ...jest.requireActual('@/lib/supabase'),
  isSupabaseConfigured: true,
}));

const fetchRecettesPublieesMock = recettesRepository.fetchRecettesPubliees as jest.Mock;

function recette(overrides: Partial<Recette>): Recette {
  return {
    id: 'r-test',
    titre: 'Recette test',
    description: '',
    image_url: '',
    temps_preparation: 20,
    difficulte: 'facile',
    cout_estime: 10,
    calories: 400,
    portions: 2,
    regime: [],
    allergenes: [],
    ingredients: [],
    etapes: [],
    est_communautaire: false,
    ...overrides,
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useRecettes', () => {
  beforeEach(() => {
    fetchRecettesPublieesMock.mockReset();
  });

  it('succes : expose les recettes publiees une fois chargees', async () => {
    fetchRecettesPublieesMock.mockResolvedValue([recette({ id: 'r-1' }), recette({ id: 'r-2' })]);

    const { result } = await renderHook(() => useRecettes(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(false);
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.data.pages.flat()).toHaveLength(2);
  });

  it('vide : isEmpty passe a true quand le catalogue distant est vide (pas de repli sur les mocks)', async () => {
    fetchRecettesPublieesMock.mockResolvedValue([]);

    const { result } = await renderHook(() => useRecettes(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(false);
    expect(result.current.isEmpty).toBe(true);
    expect(result.current.data.pages.flat()).toHaveLength(0);
  });

  it('erreur : isError passe a true sans jamais afficher RECETTES_MOCK a la place', async () => {
    fetchRecettesPublieesMock.mockRejectedValue(new Error('reseau indisponible'));

    const { result } = await renderHook(() => useRecettes(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.data.pages.flat()).toHaveLength(0);
  });

  it('rafraichissement : refetch() relance un appel reseau et met a jour les donnees', async () => {
    fetchRecettesPublieesMock.mockResolvedValueOnce([recette({ id: 'r-1' })]);

    const { result } = await renderHook(() => useRecettes(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data.pages.flat()).toHaveLength(1);

    fetchRecettesPublieesMock.mockResolvedValueOnce([recette({ id: 'r-1' }), recette({ id: 'r-2' })]);
    await result.current.refetch();

    await waitFor(() => expect(result.current.data.pages.flat()).toHaveLength(2));
    expect(fetchRecettesPublieesMock).toHaveBeenCalledTimes(2);
  });

  it('filtre par regime et pagine cote client (PAGE_SIZE=10)', async () => {
    const recettesVegetariennes = Array.from({ length: 12 }, (_, i) =>
      recette({ id: `veg-${i}`, regime: ['vegetarien'] }),
    );
    fetchRecettesPublieesMock.mockResolvedValue([
      ...recettesVegetariennes,
      recette({ id: 'viande-1', regime: [] }),
    ]);

    const { result } = await renderHook(() => useRecettes({ regime: ['vegetarien'] }), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data.pages[0]).toHaveLength(10);
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => result.current.fetchNextPage());
    await waitFor(() => expect(result.current.data.pages).toHaveLength(2));
    expect(result.current.data.pages.flat()).toHaveLength(12);
    expect(result.current.hasNextPage).toBe(false);
  });
});
