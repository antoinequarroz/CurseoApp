import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRecettes } from '@/hooks/useRecettes';
import * as recettesRepository from '@/lib/recettesRepository';

// Volontairement AUCUN mock de '@/lib/supabase' : en environnement de test,
// Constants.expoConfig?.extra n'est jamais peuple (pas de config Expo
// chargee), donc isSupabaseConfigured vaut naturellement false — exactement
// le scenario "poste de dev sans backend configure" que ce fichier verifie,
// sans avoir a simuler artificiellement la valeur d'un booleen expose comme
// const (fragile avec le hoisting de jest.mock, voir useRecettes.test.tsx).
jest.mock('@/lib/recettesRepository');

const fetchRecettesPublieesMock = recettesRepository.fetchRecettesPubliees as jest.Mock;

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useRecettes sans Supabase configure', () => {
  it('utilise RECETTES_MOCK sans jamais appeler fetchRecettesPubliees', async () => {
    const { result } = await renderHook(() => useRecettes(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchRecettesPublieesMock).not.toHaveBeenCalled();
    expect(result.current.isError).toBe(false);
    expect(result.current.data.pages.flat().length).toBeGreaterThan(0);
  });
});
