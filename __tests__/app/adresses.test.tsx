import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/lib/theme-context';
import { useProfilStore } from '@/stores/profilStore';
import Adresses from '@/app/adresses';
import { useAdresses } from '@/hooks/useAdresses';
import type { Profil, AdresseLivraison } from '@/types';

jest.mock('@/hooks/useAdresses');

const useAdressesMock = useAdresses as jest.Mock;

const METRICS_TEST = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

async function renderAvecProviders() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS_TEST}>
      <ThemeProvider>
        <Adresses />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

const profilBase: Profil = {
  id: 'u-1', prenom: 'Alex', nb_personnes: 2, nb_enfants: 0, enfants_ages: [], budget_hebdo: 150,
  regime: [], allergies: [], objectifs: [], enseignes_favorites: [], abonnement: 'gratuit',
  notifications_activees: true, notifications_planning: true, notifications_budget: true,
  notifications_promos: false, notifications_bilan: true, apparence: 'auto', cgvu_version_acceptee: null,
};

function adresse(overrides: Partial<AdresseLivraison> = {}): AdresseLivraison {
  return { id: 'a-1', libelle: 'Domicile', rue: 'Rue du Rhône 12', npa: '1000', ville: 'Lausanne', complement: null, estDefaut: false, ...overrides };
}

function etatHookParDefaut(overrides: Partial<ReturnType<typeof useAdresses>> = {}) {
  return {
    adresses: [], isLoading: false, isError: false, isEmpty: true, refetch: jest.fn(), mutationEnCours: false,
    ajouter: jest.fn().mockResolvedValue(undefined), modifier: jest.fn().mockResolvedValue(undefined), retirer: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('Adresses', () => {
  beforeEach(() => {
    useProfilStore.getState().setProfil(profilBase);
  });
  afterEach(() => {
    // COUR-28 : ne PAS reinitialiser profilStore ici — un re-render tardif du
    // composant du test precedent (encore monte) survenant apres
    // mockReset() planterait sur useAdresses() redevenu undefined. Chaque
    // test fixe deja son propre profil via beforeEach, un reset explicite
    // n'apporte rien ici.
    useAdressesMock.mockReset();
  });

  it('chargement : n\'affiche pas encore l\'etat vide', async () => {
    useAdressesMock.mockReturnValue(etatHookParDefaut({ isLoading: true, isEmpty: false }));
    const { queryByText } = await renderAvecProviders();
    expect(queryByText('Aucune adresse enregistrée')).toBeNull();
  });

  it('erreur : affiche un message avec bouton reessayer', async () => {
    const refetch = jest.fn();
    useAdressesMock.mockReturnValue(etatHookParDefaut({ isError: true, isEmpty: false, refetch }));
    const { getByText } = await renderAvecProviders();
    expect(getByText('Impossible de charger tes adresses')).toBeTruthy();
    fireEvent.press(getByText('Réessayer'));
    expect(refetch).toHaveBeenCalled();
  });

  it('vide : propose d\'ajouter une premiere adresse', async () => {
    useAdressesMock.mockReturnValue(etatHookParDefaut());
    const { getByText, findByLabelText } = await renderAvecProviders();
    expect(getByText('Aucune adresse enregistrée')).toBeTruthy();
    fireEvent.press(getByText('Ajouter une adresse'));
    expect(await findByLabelText('Libellé')).toBeTruthy();
  });

  it('ajout : formulaire complet valide appelle ajouter()', async () => {
    const ajouter = jest.fn().mockResolvedValue(undefined);
    useAdressesMock.mockReturnValue(etatHookParDefaut({ ajouter }));

    const { getByText, findByLabelText } = await renderAvecProviders();
    fireEvent.press(getByText('Ajouter une adresse'));

    fireEvent.changeText(await findByLabelText('Libellé'), 'Domicile');
    fireEvent.changeText(await findByLabelText('Rue et numéro'), 'Rue du Rhône 12');
    fireEvent.changeText(await findByLabelText('NPA'), '1000');
    fireEvent.changeText(await findByLabelText('Ville'), 'Lausanne');
    fireEvent.press(await findByLabelText('Enregistrer'));

    await waitFor(() =>
      expect(ajouter).toHaveBeenCalledWith({ libelle: 'Domicile', rue: 'Rue du Rhône 12', npa: '1000', ville: 'Lausanne', estDefaut: false }),
    );
  });

  it('ajout : NPA invalide refuse l\'enregistrement (ajouter() non appele)', async () => {
    const ajouter = jest.fn();
    useAdressesMock.mockReturnValue(etatHookParDefaut({ ajouter }));

    const { getByText, findByLabelText } = await renderAvecProviders();
    fireEvent.press(getByText('Ajouter une adresse'));

    fireEvent.changeText(await findByLabelText('Libellé'), 'Domicile');
    fireEvent.changeText(await findByLabelText('Rue et numéro'), 'Rue du Rhône 12');
    fireEvent.changeText(await findByLabelText('NPA'), '12');
    fireEvent.changeText(await findByLabelText('Ville'), 'Lausanne');
    fireEvent.press(await findByLabelText('Enregistrer'));

    await waitFor(() => expect(ajouter).not.toHaveBeenCalled());
  });

  it('liste : affiche les adresses existantes', async () => {
    useAdressesMock.mockReturnValue(etatHookParDefaut({ isEmpty: false, adresses: [adresse({ estDefaut: true })] }));
    const { getByText } = await renderAvecProviders();
    expect(getByText('Domicile')).toBeTruthy();
    expect(getByText('Rue du Rhône 12')).toBeTruthy();
    expect(getByText('1000 Lausanne')).toBeTruthy();
  });

  it('retrait : necessite une confirmation avant d\'appeler retirer()', async () => {
    const retirer = jest.fn().mockResolvedValue(undefined);
    useAdressesMock.mockReturnValue(etatHookParDefaut({ isEmpty: false, adresses: [adresse({ id: 'a-1' })], retirer }));

    const { getByLabelText, getByText, findByText } = await renderAvecProviders();
    fireEvent.press(getByLabelText('Retirer Domicile'));
    expect(await findByText("Retirer l'adresse Domicile ?")).toBeTruthy();
    expect(retirer).not.toHaveBeenCalled();

    fireEvent.press(getByText('Confirmer'));
    await waitFor(() => expect(retirer).toHaveBeenCalledWith('a-1'));
  });
});
