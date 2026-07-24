import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMembresFoyer, LIMITE_MEMBRES_FAMILLE } from '@/hooks/useMembresFoyer';
import * as membresFoyerRepository from '@/lib/membresFoyerRepository';
import type { MembreFoyer } from '@/types';

jest.mock('@/lib/membresFoyerRepository');

const fetchOuCreerFoyerIdMock = membresFoyerRepository.fetchOuCreerFoyerId as jest.Mock;
const fetchMembresFoyerMock = membresFoyerRepository.fetchMembresFoyer as jest.Mock;
const ajouterMembreMock = membresFoyerRepository.ajouterMembre as jest.Mock;
const modifierMembreMock = membresFoyerRepository.modifierMembre as jest.Mock;
const retirerMembreMock = membresFoyerRepository.retirerMembre as jest.Mock;

function membre(overrides: Partial<MembreFoyer>): MembreFoyer {
  return { id: 'm-1', prenom: 'Enfant', age: 6, regime: [], allergies: [], ...overrides };
}

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useMembresFoyer', () => {
  beforeEach(() => {
    fetchOuCreerFoyerIdMock.mockReset();
    fetchMembresFoyerMock.mockReset();
    ajouterMembreMock.mockReset();
    modifierMembreMock.mockReset();
    retirerMembreMock.mockReset();
    fetchOuCreerFoyerIdMock.mockResolvedValue('foyer-1');
  });

  it('succes : expose les membres une fois charges', async () => {
    fetchMembresFoyerMock.mockResolvedValue([membre({ id: 'm-1' }), membre({ id: 'm-2' })]);

    const { result } = await renderHook(() => useMembresFoyer(), { wrapper });
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(false);
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.membres).toHaveLength(2);
  });

  it('vide : isEmpty passe a true quand le foyer n\'a aucun membre', async () => {
    fetchMembresFoyerMock.mockResolvedValue([]);

    const { result } = await renderHook(() => useMembresFoyer(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isEmpty).toBe(true);
  });

  it('erreur : isError passe a true si le foyer ne peut pas etre charge', async () => {
    fetchOuCreerFoyerIdMock.mockRejectedValue(new Error('reseau indisponible'));

    const { result } = await renderHook(() => useMembresFoyer(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(true);
  });

  it('ajouter : appelle le repository avec le foyer courant puis rafraichit la liste', async () => {
    fetchMembresFoyerMock.mockResolvedValueOnce([]).mockResolvedValueOnce([membre({ id: 'm-nouveau', prenom: 'Nouveau' })]);
    ajouterMembreMock.mockResolvedValue(membre({ id: 'm-nouveau', prenom: 'Nouveau' }));

    const { result } = await renderHook(() => useMembresFoyer(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.ajouter({ prenom: 'Nouveau', age: null, regime: [], allergies: [] });
    });

    expect(ajouterMembreMock).toHaveBeenCalledWith('foyer-1', { prenom: 'Nouveau', age: null, regime: [], allergies: [] });
    await waitFor(() => expect(result.current.membres).toHaveLength(1));
  });

  it('modifier : appelle le repository avec l\'id du membre puis rafraichit', async () => {
    fetchMembresFoyerMock
      .mockResolvedValueOnce([membre({ id: 'm-1', prenom: 'Avant' })])
      .mockResolvedValueOnce([membre({ id: 'm-1', prenom: 'Apres' })]);
    modifierMembreMock.mockResolvedValue(membre({ id: 'm-1', prenom: 'Apres' }));

    const { result } = await renderHook(() => useMembresFoyer(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.modifier('m-1', { prenom: 'Apres', age: null, regime: [], allergies: [] });
    });

    expect(modifierMembreMock).toHaveBeenCalledWith('m-1', { prenom: 'Apres', age: null, regime: [], allergies: [] });
    await waitFor(() => expect(result.current.membres[0]?.prenom).toBe('Apres'));
  });

  it('retirer : appelle le repository puis rafraichit la liste', async () => {
    fetchMembresFoyerMock.mockResolvedValueOnce([membre({ id: 'm-1' })]).mockResolvedValueOnce([]);
    retirerMembreMock.mockResolvedValue(undefined);

    const { result } = await renderHook(() => useMembresFoyer(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.retirer('m-1');
    });

    expect(retirerMembreMock).toHaveBeenCalledWith('m-1');
    await waitFor(() => expect(result.current.isEmpty).toBe(true));
  });

  it('limite : limiteAtteinte passe a true une fois le nombre max de membres atteint', async () => {
    fetchMembresFoyerMock.mockResolvedValue(
      Array.from({ length: LIMITE_MEMBRES_FAMILLE }, (_, i) => membre({ id: `m-${i}` })),
    );

    const { result } = await renderHook(() => useMembresFoyer(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.membres).toHaveLength(LIMITE_MEMBRES_FAMILLE);
    expect(result.current.limiteAtteinte).toBe(true);
  });
});
