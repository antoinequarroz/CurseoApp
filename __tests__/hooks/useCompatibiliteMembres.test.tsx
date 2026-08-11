import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCompatibiliteMembres } from '@/hooks/useCompatibiliteMembres';
import * as allergenesRepository from '@/lib/allergenesRepository';
import type { MembreFoyer, Recette } from '@/types';

jest.mock('@/lib/allergenesRepository');
jest.mock('@/lib/supabase', () => ({
  ...jest.requireActual('@/lib/supabase'),
  isSupabaseConfigured: true,
}));

const fetchSynonymesAllergenesMock = allergenesRepository.fetchSynonymesAllergenes as jest.Mock;

function recette(overrides: Partial<Recette>): Recette {
  return {
    id: 'r-1',
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

function membre(overrides: Partial<MembreFoyer>): MembreFoyer {
  return { id: 'm-1', prenom: 'Membre', age: null, regime: [], allergies: [], ...overrides };
}

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useCompatibiliteMembres', () => {
  beforeEach(() => {
    fetchSynonymesAllergenesMock.mockReset();
    fetchSynonymesAllergenesMock.mockResolvedValue([{ terme: 'gluten', code: 'gluten' }]);
  });

  it('aucun membre selectionne : aucune restriction, toutes les recettes passent', async () => {
    const recettes = [recette({ id: 'r-1' }), recette({ id: 'r-2' })];
    const { result } = await renderHook(() => useCompatibiliteMembres(recettes, []), { wrapper });

    expect(result.current.recettes).toHaveLength(2);
    expect(result.current.alertesParRecette).toEqual({});
    expect(fetchSynonymesAllergenesMock).not.toHaveBeenCalled();
  });

  it("contraintes de plusieurs membres fusionnees : exclut une recette incompatible avec l'un d'eux", async () => {
    const recettes = [
      recette({ id: 'ok', regime: ['vegetarien'] }),
      recette({ id: 'non-vegetarien', regime: [] }),
    ];
    const membres = [membre({ id: 'm-1', regime: ['vegetarien'] }), membre({ id: 'm-2', regime: [] })];

    const { result } = await renderHook(() => useCompatibiliteMembres(recettes, membres), { wrapper });
    await waitFor(() => expect(result.current.recettes.map((r) => r.id)).toEqual(['ok']));
    expect(fetchSynonymesAllergenesMock).not.toHaveBeenCalled();
  });

  it('allergie confirmee chez un seul membre selectionne suffit a exclure la recette pour tous', async () => {
    const recettes = [
      recette({ id: 'avec-gluten', allergenesEffectifs: [{ code: 'gluten', libelle: 'Gluten', source: 'declare', certitude: 'confirme' }] }),
      recette({ id: 'sans-allergene' }),
    ];
    const membres = [membre({ id: 'm-1', allergies: ['gluten'] }), membre({ id: 'm-2', allergies: [] })];

    const { result } = await renderHook(() => useCompatibiliteMembres(recettes, membres), { wrapper });
    await waitFor(() => expect(result.current.recettes.map((r) => r.id)).toEqual(['sans-allergene']));
  });
});
