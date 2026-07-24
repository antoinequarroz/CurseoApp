import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/lib/theme-context';
import { useProfilStore } from '@/stores/profilStore';
import MembresFoyer from '@/app/membres-foyer';
import { useMembresFoyer } from '@/hooks/useMembresFoyer';
import type { Profil, MembreFoyer } from '@/types';

jest.mock('@/hooks/useMembresFoyer');

const useMembresFoyerMock = useMembresFoyer as jest.Mock;

const METRICS_TEST = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

async function renderAvecProviders() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS_TEST}>
      <ThemeProvider>
        <MembresFoyer />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

const profilBase: Profil = {
  id: 'u-1',
  prenom: 'Alex',
  nb_personnes: 3,
  nb_enfants: 1,
  enfants_ages: [6],
  budget_hebdo: 150,
  regime: [],
  allergies: [],
  objectifs: [],
  enseignes_favorites: [],
  abonnement: 'gratuit',
  notifications_activees: true,
  notifications_planning: true,
  notifications_budget: true,
  notifications_promos: false,
  notifications_bilan: true,
  apparence: 'auto',
  cgvu_version_acceptee: null,
};

function membre(overrides: Partial<MembreFoyer>): MembreFoyer {
  return { id: 'm-1', prenom: 'Léo', age: 6, regime: [], allergies: [], ...overrides };
}

function etatHookParDefaut(overrides: Partial<ReturnType<typeof useMembresFoyer>> = {}) {
  return {
    membres: [],
    isLoading: false,
    isError: false,
    isEmpty: true,
    refetch: jest.fn(),
    limite: 6,
    limiteAtteinte: false,
    mutationEnCours: false,
    ajouter: jest.fn().mockResolvedValue(undefined),
    modifier: jest.fn().mockResolvedValue(undefined),
    retirer: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('MembresFoyer', () => {
  afterEach(() => {
    useProfilStore.getState().reset();
    useMembresFoyerMock.mockReset();
  });

  it('palier non-famille : affiche une explication et un acces au paywall', async () => {
    useProfilStore.getState().setProfil({ ...profilBase, abonnement: 'standard' });
    useMembresFoyerMock.mockReturnValue(etatHookParDefaut());

    const { getByText } = await renderAvecProviders();

    expect(getByText('Fonctionnalité du palier Famille')).toBeTruthy();
    expect(getByText('Débloquer avec Famille')).toBeTruthy();
  });

  it('palier non-famille : le tap sur le CTA ouvre le paywall', async () => {
    useProfilStore.getState().setProfil({ ...profilBase, abonnement: 'gratuit' });
    useMembresFoyerMock.mockReturnValue(etatHookParDefaut());

    const { getByText, findByLabelText } = await renderAvecProviders();
    fireEvent.press(getByText('Débloquer avec Famille'));

    expect(await findByLabelText('Fermer')).toBeTruthy();
  });

  it('chargement : n\'affiche pas encore l\'etat vide pour un abonne Famille', async () => {
    useProfilStore.getState().setProfil({ ...profilBase, abonnement: 'famille' });
    useMembresFoyerMock.mockReturnValue(etatHookParDefaut({ isLoading: true, isEmpty: false }));

    const { queryByText } = await renderAvecProviders();
    expect(queryByText('Aucun membre ajouté')).toBeNull();
  });

  it('erreur : affiche un message avec bouton reessayer', async () => {
    useProfilStore.getState().setProfil({ ...profilBase, abonnement: 'famille' });
    const refetch = jest.fn();
    useMembresFoyerMock.mockReturnValue(etatHookParDefaut({ isError: true, isEmpty: false, refetch }));

    const { getByText } = await renderAvecProviders();
    expect(getByText('Impossible de charger les membres')).toBeTruthy();

    fireEvent.press(getByText('Réessayer'));
    expect(refetch).toHaveBeenCalled();
  });

  it('vide : propose d\'ajouter un premier membre', async () => {
    useProfilStore.getState().setProfil({ ...profilBase, abonnement: 'famille' });
    useMembresFoyerMock.mockReturnValue(etatHookParDefaut());

    const { getByText, findByText } = await renderAvecProviders();
    expect(getByText('Aucun membre ajouté')).toBeTruthy();

    fireEvent.press(getByText('Ajouter un membre'));
    expect(await findByText('Prénom')).toBeTruthy();
  });

  it('ajout : remplir le prenom et enregistrer appelle ajouter()', async () => {
    useProfilStore.getState().setProfil({ ...profilBase, abonnement: 'famille' });
    const ajouter = jest.fn().mockResolvedValue(undefined);
    useMembresFoyerMock.mockReturnValue(etatHookParDefaut({ ajouter }));

    const { getByText, findByLabelText, findByText } = await renderAvecProviders();
    fireEvent.press(getByText('Ajouter un membre'));

    fireEvent.changeText(await findByLabelText('Prénom'), 'Léo');
    fireEvent.press(await findByText('Enregistrer'));

    await waitFor(() => expect(ajouter).toHaveBeenCalledWith({ prenom: 'Léo', age: null, regime: [], allergies: [] }));
  });

  it('ajout : prenom vide refuse l\'enregistrement (ajouter() non appele)', async () => {
    useProfilStore.getState().setProfil({ ...profilBase, abonnement: 'famille' });
    const ajouter = jest.fn();
    useMembresFoyerMock.mockReturnValue(etatHookParDefaut({ ajouter }));

    const { getByText, findByText } = await renderAvecProviders();
    fireEvent.press(getByText('Ajouter un membre'));
    fireEvent.press(await findByText('Enregistrer'));

    expect(ajouter).not.toHaveBeenCalled();
  });

  it('liste : affiche les membres existants avec leurs regimes/allergies', async () => {
    useProfilStore.getState().setProfil({ ...profilBase, abonnement: 'famille' });
    useMembresFoyerMock.mockReturnValue(
      etatHookParDefaut({ isEmpty: false, membres: [membre({ prenom: 'Léo', regime: ['vegetarien'], allergies: ['arachide'] })] }),
    );

    const { getByText } = await renderAvecProviders();
    expect(getByText('Léo')).toBeTruthy();
    expect(getByText('Végétarien')).toBeTruthy();
    expect(getByText('arachide')).toBeTruthy();
  });

  it('retrait : necessite une confirmation avant d\'appeler retirer()', async () => {
    useProfilStore.getState().setProfil({ ...profilBase, abonnement: 'famille' });
    const retirer = jest.fn().mockResolvedValue(undefined);
    useMembresFoyerMock.mockReturnValue(etatHookParDefaut({ isEmpty: false, membres: [membre({ id: 'm-1', prenom: 'Léo' })], retirer }));

    const { getByLabelText, getByText, findByText } = await renderAvecProviders();
    fireEvent.press(getByLabelText('Retirer Léo'));
    expect(await findByText('Retirer Léo du foyer ?')).toBeTruthy();
    expect(retirer).not.toHaveBeenCalled();

    fireEvent.press(getByText('Confirmer'));
    await waitFor(() => expect(retirer).toHaveBeenCalledWith('m-1'));
  });

  it('limite atteinte : le bouton ajouter est desactive et un message explique pourquoi', async () => {
    useProfilStore.getState().setProfil({ ...profilBase, abonnement: 'famille' });
    useMembresFoyerMock.mockReturnValue(
      etatHookParDefaut({ isEmpty: false, membres: [membre({})], limiteAtteinte: true, limite: 6 }),
    );

    const { getByText } = await renderAvecProviders();
    expect(getByText('Limite de 6 membres atteinte pour ce palier.')).toBeTruthy();
  });
});
