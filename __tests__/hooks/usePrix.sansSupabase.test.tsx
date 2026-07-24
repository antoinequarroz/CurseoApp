import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePrix } from '@/hooks/usePrix';
import * as prixRepository from '@/lib/prixRepository';

// Volontairement AUCUN mock de '@/lib/supabase' : isSupabaseConfigured vaut
// naturellement false en environnement de test (voir useRecettes.sansSupabase.test.tsx
// pour le raisonnement complet).
jest.mock('@/lib/prixRepository');

const fetchComparatifPrixMock = prixRepository.fetchComparatifPrix as jest.Mock;

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('usePrix sans Supabase configure', () => {
  it('utilise lib/mocks/prix.mock.ts sans jamais appeler fetchComparatifPrix', async () => {
    const { result } = await renderHook(() => usePrix('Pâtes penne 500g'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchComparatifPrixMock).not.toHaveBeenCalled();
    expect(result.current.data?.offres.length).toBeGreaterThan(0);
  });
});
