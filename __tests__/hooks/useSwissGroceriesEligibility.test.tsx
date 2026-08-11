import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useSwissGroceriesEligibility } from '@/hooks/useSwissGroceriesEligibility';
import { fetchSwissGroceriesEligibility } from '@/lib/swissGroceriesRepository';
import { useProfilStore } from '@/stores/profilStore';
import type { Profil } from '@/types';

jest.mock('@/lib/swissGroceriesRepository', () => ({
  swissGroceriesBuildEnabled: true,
  fetchSwissGroceriesEligibility: jest.fn(),
}));
jest.mock('@/lib/supabase', () => ({ isSupabaseConfigured: true }));
jest.mock('@/lib/abonnementHorsLigne', () => ({ memoriserAbonnementVerifie: jest.fn() }));

const fetchEligibilityMock = fetchSwissGroceriesEligibility as jest.Mock;
const profil: Profil = {
  id: '11111111-1111-1111-1111-111111111111',
  prenom: 'Canary',
  nb_personnes: 1,
  nb_enfants: 0,
  enfants_ages: [],
  budget_hebdo: 100,
  regime: [],
  allergies: [],
  objectifs: [],
  enseignes_favorites: [],
  abonnement: 'standard',
  notifications_activees: true,
  notifications_planning: true,
  notifications_budget: true,
  notifications_promos: false,
  notifications_bilan: true,
  apparence: 'auto',
  cgvu_version_acceptee: null,
};

let queryClient: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useSwissGroceriesEligibility', () => {
  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
    useProfilStore.getState().reset();
    fetchEligibilityMock.mockReset();
  });

  it('ne contacte pas le serveur tant que le profil Auth n est pas charge', async () => {
    const { result } = await renderHook(() => useSwissGroceriesEligibility(), { wrapper });

    expect(result.current).toEqual({ eligible: false, isLoading: false });
    expect(fetchEligibilityMock).not.toHaveBeenCalled();
  });

  it('rend visible le canary uniquement apres une reponse serveur positive', async () => {
    useProfilStore.getState().setProfil(profil);
    fetchEligibilityMock.mockResolvedValue(true);
    const { result } = await renderHook(() => useSwissGroceriesEligibility(), { wrapper });

    expect(result.current.eligible).toBe(false);
    await waitFor(() => expect(result.current.eligible).toBe(true));
    expect(fetchEligibilityMock).toHaveBeenCalledTimes(1);
  });

  it('reste silencieusement sur l experience standard si le serveur refuse', async () => {
    useProfilStore.getState().setProfil(profil);
    fetchEligibilityMock.mockResolvedValue(false);
    const { result } = await renderHook(() => useSwissGroceriesEligibility(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.eligible).toBe(false);
  });

  it('reste sur l experience standard si la verification serveur echoue', async () => {
    useProfilStore.getState().setProfil(profil);
    fetchEligibilityMock.mockRejectedValue(new Error('reseau indisponible'));
    const { result } = await renderHook(() => useSwissGroceriesEligibility(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.eligible).toBe(false);
  });

  it('ne transmet pas l eligibilite lors d un changement de compte', async () => {
    useProfilStore.getState().setProfil(profil);
    fetchEligibilityMock.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const { result } = await renderHook(() => useSwissGroceriesEligibility(), { wrapper });

    await waitFor(() => expect(result.current.eligible).toBe(true));
    await act(async () => {
      useProfilStore.getState().setProfil({ ...profil, id: '22222222-2222-2222-2222-222222222222' });
    });

    expect(result.current.eligible).toBe(false);
    await waitFor(() => expect(fetchEligibilityMock).toHaveBeenCalledTimes(2));
    expect(result.current.eligible).toBe(false);
  });
});
