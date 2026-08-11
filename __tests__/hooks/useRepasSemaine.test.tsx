import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRepasSemaine } from '@/hooks/useRepasSemaine';
import * as repasPlanifiesRepository from '@/lib/repasPlanifiesRepository';
import type { PlanningHebdomadaire, Recette } from '@/types';
import { usePlanningOfflineStore } from '@/stores/planningOfflineStore';

jest.mock('@/lib/repasPlanifiesRepository');

const fetchPlanningSemaineMock = repasPlanifiesRepository.fetchPlanningSemaine as jest.Mock;
const assignerRepasMock = repasPlanifiesRepository.assignerRepas as jest.Mock;
const ignorerRepasDateMock = repasPlanifiesRepository.ignorerRepasDate as jest.Mock;
const retirerRepasDateMock = repasPlanifiesRepository.retirerRepasDate as jest.Mock;

const PLANNING_VIDE: PlanningHebdomadaire = {
  lundi: {}, mardi: {}, mercredi: {}, jeudi: {}, vendredi: {}, samedi: {}, dimanche: {},
};

function recette(overrides: Partial<Recette> = {}): Recette {
  return {
    id: 'r-1', titre: 'Recette test', description: '', image_url: '', temps_preparation: 20,
    difficulte: 'facile', cout_estime: 10, calories: 400, portions: 2, regime: [], allergenes: [],
    ingredients: [], etapes: [], est_communautaire: false, ...overrides,
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const LUNDI_S1 = new Date(2026, 6, 20);
const LUNDI_S2 = new Date(2026, 6, 27);

describe('useRepasSemaine', () => {
  beforeEach(() => {
    fetchPlanningSemaineMock.mockReset();
    assignerRepasMock.mockReset();
    ignorerRepasDateMock.mockReset();
    retirerRepasDateMock.mockReset();
    fetchPlanningSemaineMock.mockResolvedValue(PLANNING_VIDE);
    usePlanningOfflineStore.getState().reset();
  });

  it('succes : expose le planning de la semaine une fois charge', async () => {
    const planning = { ...PLANNING_VIDE, lundi: { midi: { recette: recette() } } };
    fetchPlanningSemaineMock.mockResolvedValue(planning);

    const { result } = await renderHook(() => useRepasSemaine('u-1', LUNDI_S1), { wrapper });
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.planning.lundi.midi?.recette.id).toBe('r-1');
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.hasCachedData).toBe(true);
  });

  it('vide : isEmpty passe a true quand aucun repas n\'est decide sur la semaine', async () => {
    const { result } = await renderHook(() => useRepasSemaine('u-1', LUNDI_S1), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isEmpty).toBe(true);
  });

  it('erreur : isError passe a true si la requete echoue', async () => {
    fetchPlanningSemaineMock.mockRejectedValue(new Error('reseau indisponible'));
    const { result } = await renderHook(() => useRepasSemaine('u-1', LUNDI_S1), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(true);
    expect(result.current.hasCachedData).toBe(false);
  });

  it('conserve le planning en cache quand un rafraichissement echoue', async () => {
    const planning = { ...PLANNING_VIDE, lundi: { midi: { recette: recette({ id: 'r-cache' }) } } };
    fetchPlanningSemaineMock.mockResolvedValueOnce(planning);

    const { result } = await renderHook(() => useRepasSemaine('u-1', LUNDI_S1), { wrapper });
    await waitFor(() => expect(result.current.planning.lundi.midi?.recette.id).toBe('r-cache'));

    fetchPlanningSemaineMock.mockRejectedValueOnce(new Error('reseau indisponible'));
    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.hasCachedData).toBe(true);
    expect(result.current.planning.lundi.midi?.recette.id).toBe('r-cache');
  });

  it('assigner : appelle le repository avec la date reelle du jour puis rafraichit', async () => {
    const { result } = await renderHook(() => useRepasSemaine('u-1', LUNDI_S1), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const r = recette({ id: 'r-nouvelle' });
    await act(async () => {
      await result.current.assigner('mercredi', 'midi', { recette: r, portions: 3, membreIds: ['m-1'] });
    });

    expect(assignerRepasMock).toHaveBeenCalledWith('u-1', '2026-07-22', 'midi', { recette: r, portions: 3, membreIds: ['m-1'] });
    expect(fetchPlanningSemaineMock).toHaveBeenCalledTimes(2); // fetch initial + refetch post-mutation
  });

  it('ignorer : appelle le repository avec la date reelle du jour puis rafraichit', async () => {
    const { result } = await renderHook(() => useRepasSemaine('u-1', LUNDI_S1), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.ignorer('dimanche', 'soir');
    });

    expect(ignorerRepasDateMock).toHaveBeenCalledWith('u-1', '2026-07-26', 'soir');
  });

  it('retirer : appelle le repository avec la date reelle du jour puis rafraichit', async () => {
    const { result } = await renderHook(() => useRepasSemaine('u-1', LUNDI_S1), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.retirer('lundi', 'midi');
    });

    expect(retirerRepasDateMock).toHaveBeenCalledWith('u-1', '2026-07-20', 'midi');
  });

  it('COUR-27 : changer de semaine ne melange jamais les repas d\'une autre (meme cache, requetes distinctes)', async () => {
    const planningS1 = { ...PLANNING_VIDE, lundi: { midi: { recette: recette({ id: 'recette-semaine-1' }) } } };
    const planningS2 = { ...PLANNING_VIDE, lundi: { midi: { recette: recette({ id: 'recette-semaine-2' }) } } };
    fetchPlanningSemaineMock.mockImplementation((_profilId: string, semaine: Date) =>
      Promise.resolve(semaine.getTime() === LUNDI_S1.getTime() ? planningS1 : planningS2),
    );

    const { result, rerender } = await renderHook(
      ({ semaine }: { semaine: Date }) => useRepasSemaine('u-1', semaine),
      { wrapper, initialProps: { semaine: LUNDI_S1 } },
    );
    await waitFor(() => expect(result.current.planning.lundi.midi?.recette.id).toBe('recette-semaine-1'));

    rerender({ semaine: LUNDI_S2 });
    await waitFor(() => expect(result.current.planning.lundi.midi?.recette.id).toBe('recette-semaine-2'));

    // Revenir a S1 ne redemande pas au reseau (cache distinct par semaine, deja rempli) et n'affiche jamais les donnees de S2.
    rerender({ semaine: LUNDI_S1 });
    await waitFor(() => expect(result.current.planning.lundi.midi?.recette.id).toBe('recette-semaine-1'));
  });

  it('n\'interroge jamais le backend sans profilId', async () => {
    const { result } = await renderHook(() => useRepasSemaine(undefined, LUNDI_S1), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchPlanningSemaineMock).not.toHaveBeenCalled();
  });

  it('COUR-49 : conserve une assignation hors ligne et la synchronise au retour du réseau', async () => {
    const { result, rerender } = await renderHook(
      ({ horsLigne }: { horsLigne: boolean }) => useRepasSemaine('u-1', LUNDI_S1, horsLigne),
      { wrapper, initialProps: { horsLigne: true } },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.assigner('mardi', 'soir', { recette: recette({ id: 'offline' }) });
    });
    expect(assignerRepasMock).not.toHaveBeenCalled();
    expect(result.current.planning.mardi.soir?.recette.id).toBe('offline');
    expect(result.current.synchronisationsEnAttente).toBe(1);

    await act(async () => {
      rerender({ horsLigne: false });
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    await waitFor(() => expect(assignerRepasMock).toHaveBeenCalledWith('u-1', '2026-07-21', 'soir', expect.any(Object)));
    await waitFor(() => expect(usePlanningOfflineStore.getState().operations).toHaveLength(0));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  });

  it('COUR-50 : annule la dernière assignation', async () => {
    const { result } = await renderHook(() => useRepasSemaine('u-1', LUNDI_S1), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.assigner('jeudi', 'midi', { recette: recette({ id: 'a-annuler' }) });
    });
    expect(result.current.peutAnnuler).toBe(true);
    await act(async () => {
      await result.current.annulerDerniereAction();
    });
    expect(retirerRepasDateMock).toHaveBeenCalledWith('u-1', '2026-07-23', 'midi');
    expect(result.current.peutAnnuler).toBe(false);
  });
});
