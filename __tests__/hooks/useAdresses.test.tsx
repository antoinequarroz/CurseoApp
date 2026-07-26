import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAdresses } from '@/hooks/useAdresses';
import * as adressesRepository from '@/lib/adressesRepository';
import type { AdresseLivraison } from '@/types';

jest.mock('@/lib/adressesRepository');

const fetchAdressesMock = adressesRepository.fetchAdresses as jest.Mock;
const ajouterAdresseMock = adressesRepository.ajouterAdresse as jest.Mock;
const modifierAdresseMock = adressesRepository.modifierAdresse as jest.Mock;
const retirerAdresseMock = adressesRepository.retirerAdresse as jest.Mock;

function adresse(overrides: Partial<AdresseLivraison> = {}): AdresseLivraison {
  return { id: 'a-1', libelle: 'Domicile', rue: 'Rue du Rhône 12', npa: '1000', ville: 'Lausanne', complement: null, estDefaut: false, ...overrides };
}

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useAdresses', () => {
  beforeEach(() => {
    fetchAdressesMock.mockReset();
    ajouterAdresseMock.mockReset();
    modifierAdresseMock.mockReset();
    retirerAdresseMock.mockReset();
  });

  it('succes : expose les adresses une fois chargees', async () => {
    fetchAdressesMock.mockResolvedValue([adresse({ id: 'a-1' }), adresse({ id: 'a-2' })]);

    const { result } = await renderHook(() => useAdresses('u-1'), { wrapper });
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.adresses).toHaveLength(2);
    expect(result.current.isEmpty).toBe(false);
  });

  it('vide : isEmpty passe a true quand le profil n\'a aucune adresse', async () => {
    fetchAdressesMock.mockResolvedValue([]);
    const { result } = await renderHook(() => useAdresses('u-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isEmpty).toBe(true);
  });

  it('erreur : isError passe a true si la requete echoue', async () => {
    fetchAdressesMock.mockRejectedValue(new Error('reseau indisponible'));
    const { result } = await renderHook(() => useAdresses('u-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(true);
  });

  it('ajouter : appelle le repository avec le profil courant puis rafraichit', async () => {
    fetchAdressesMock.mockResolvedValueOnce([]).mockResolvedValueOnce([adresse({ id: 'a-nouvelle' })]);
    ajouterAdresseMock.mockResolvedValue(adresse({ id: 'a-nouvelle' }));

    const { result } = await renderHook(() => useAdresses('u-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const donnees = { libelle: 'Bureau', rue: 'Rue Centrale 5', npa: '1003', ville: 'Lausanne', estDefaut: false };
    await act(async () => {
      await result.current.ajouter(donnees);
    });

    expect(ajouterAdresseMock).toHaveBeenCalledWith('u-1', donnees);
    await waitFor(() => expect(result.current.adresses).toHaveLength(1));
  });

  it('modifier : appelle le repository avec l\'id de l\'adresse et le profil courant', async () => {
    fetchAdressesMock.mockResolvedValue([adresse({ id: 'a-1' })]);
    modifierAdresseMock.mockResolvedValue(adresse({ id: 'a-1', libelle: 'Nouveau libellé' }));

    const { result } = await renderHook(() => useAdresses('u-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const donnees = { libelle: 'Nouveau libellé', rue: 'Rue du Rhône 12', npa: '1000', ville: 'Lausanne', estDefaut: false };
    await act(async () => {
      await result.current.modifier('a-1', donnees);
    });

    expect(modifierAdresseMock).toHaveBeenCalledWith('a-1', 'u-1', donnees);
  });

  it('retirer : appelle le repository puis rafraichit la liste', async () => {
    fetchAdressesMock.mockResolvedValueOnce([adresse({ id: 'a-1' })]).mockResolvedValueOnce([]);
    retirerAdresseMock.mockResolvedValue(undefined);

    const { result } = await renderHook(() => useAdresses('u-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.retirer('a-1');
    });

    expect(retirerAdresseMock).toHaveBeenCalledWith('a-1');
    await waitFor(() => expect(result.current.isEmpty).toBe(true));
  });

  it('n\'interroge jamais le backend sans profilId', async () => {
    const { result } = await renderHook(() => useAdresses(undefined), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchAdressesMock).not.toHaveBeenCalled();
  });
});
