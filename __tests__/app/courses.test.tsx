import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/lib/theme-context';
import { useProfilStore } from '@/stores/profilStore';
import { useCoursesStore } from '@/stores/coursesStore';
import { useAbonnement } from '@/hooks/useAbonnement';
import { useCoursesSync } from '@/hooks/useCoursesSync';
import { useSwissGroceriesEligibility } from '@/hooks/useSwissGroceriesEligibility';
import Courses from '@/app/(tabs)/courses';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import type { Profil } from '@/types';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@react-native-community/netinfo', () =>
  jest.requireActual('@react-native-community/netinfo/jest/netinfo-mock'),
);
jest.mock('@/hooks/useCoursesSync', () => ({
  useCoursesSync: jest.fn(() => ({
    estConnecte: true,
    syncing: false,
    syncEnAttente: false,
    erreurSynchronisation: false,
    reessayer: jest.fn(),
  })),
}));
jest.mock('@/hooks/useAbonnement');
jest.mock('@/hooks/useSwissGroceriesEligibility');
jest.mock('@/hooks/usePreferencesCourses', () => ({
  usePreferencesCourses: () => ({ data: undefined }),
}));
jest.mock('@/lib/toast', () => ({ toast: { succes: jest.fn(), erreur: jest.fn(), economies: jest.fn() } }));
jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn(() => ({ insert: jest.fn().mockResolvedValue({ error: null }) })) },
}));

const mockStateCoursesStore = {
  items: [] as { nom: string; coche: boolean; rayon: string }[],
  toggleCoche: jest.fn(),
  ajouterItemLibre: jest.fn(),
  retirerItem: jest.fn(),
};
const useCoursesStoreFn = useCoursesStore as unknown as jest.Mock;
jest.mock('@/stores/coursesStore', () => {
  const fn = jest.fn(() => mockStateCoursesStore);
  (fn as unknown as { persist: unknown }).persist = {
    hasHydrated: jest.fn(() => true),
    onFinishHydration: jest.fn(() => () => {}),
  };
  return { useCoursesStore: fn };
});

const mockStatePanierStore = {
  mode: 'prix_minimum',
  recap: null as null | { paniers: unknown[]; montant_total: number; economies: number },
  setMode: jest.fn(),
  calculer: jest.fn(),
};
jest.mock('@/stores/panierStore', () => ({ usePanierStore: jest.fn(() => mockStatePanierStore) }));

const useAbonnementMock = useAbonnement as jest.Mock;
const useCoursesSyncMock = useCoursesSync as jest.Mock;
const useSwissGroceriesEligibilityMock = useSwissGroceriesEligibility as jest.Mock;
const reessayerSynchronisationMock = jest.fn();

const METRICS_TEST = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

async function renderAvecProviders() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS_TEST}>
      <ThemeProvider>
        <Courses />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

const profilBase: Profil = {
  id: 'u-1',
  prenom: 'Alex',
  nb_personnes: 2,
  nb_enfants: 0,
  enfants_ages: [],
  budget_hebdo: 150,
  regime: [],
  allergies: [],
  objectifs: [],
  enseignes_favorites: [],
  equipements_cuisine: null,
  abonnement: 'gratuit',
  notifications_activees: true,
  notifications_planning: true,
  notifications_budget: true,
  notifications_promos: false,
  notifications_bilan: true,
  apparence: 'auto',
  cgvu_version_acceptee: null,
};

describe('Courses', () => {
  beforeEach(() => {
    useProfilStore.getState().reset();
    mockStateCoursesStore.items = [];
    mockStatePanierStore.mode = 'prix_minimum';
    mockStatePanierStore.recap = null;
    useAbonnementMock.mockReturnValue({ niveau: 'gratuit', estAuMoins: jest.fn(() => false) });
    useSwissGroceriesEligibilityMock.mockReturnValue({ eligible: false, isLoading: false });
    useCoursesSyncMock.mockReturnValue({
      estConnecte: true,
      syncing: false,
      syncEnAttente: false,
      erreurSynchronisation: false,
      reessayer: reessayerSynchronisationMock,
    });
    (
      useCoursesStoreFn as unknown as { persist: { hasHydrated: jest.Mock } }
    ).persist.hasHydrated.mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("chargement : tant que le store n'est pas hydrate, affiche le skeleton (pas le vide)", async () => {
    (
      useCoursesStoreFn as unknown as { persist: { hasHydrated: jest.Mock } }
    ).persist.hasHydrated.mockReturnValue(false);
    const { queryByText } = await renderAvecProviders();
    expect(queryByText('Rien dans ta liste')).toBeNull();
  });

  it("vide : liste vide affiche l'etat vide", async () => {
    const { getByText } = await renderAvecProviders();
    expect(getByText('Rien dans ta liste')).toBeTruthy();
  });

  it('COUR-53 : une sauvegarde en echec reste explicite et peut etre relancee', async () => {
    useCoursesSyncMock.mockReturnValue({
      estConnecte: true,
      syncing: false,
      syncEnAttente: true,
      erreurSynchronisation: true,
      reessayer: reessayerSynchronisationMock,
    });
    const { getByText, getByRole } = await renderAvecProviders();

    expect(getByText('La liste reste disponible ici. La sauvegarde en ligne attend.')).toBeTruthy();
    await fireEvent.press(getByRole('button', { name: 'Réessayer' }));
    expect(reessayerSynchronisationMock).toHaveBeenCalledTimes(1);
  });

  it("succes : liste non vide affiche les modes d'optimisation", async () => {
    mockStateCoursesStore.items = [{ nom: 'Pommes', coche: false, rayon: 'fruits_legumes' }];
    const { getByText } = await renderAvecProviders();
    expect(getByText('Prix minimum')).toBeTruthy();
    expect(getByText('Équilibré')).toBeTruthy();
  });

  it('COUR-62 : seul un compte eligible voit l optimisation live en test', async () => {
    mockStateCoursesStore.items = [{ nom: 'Pommes', coche: false, rayon: 'fruits_legumes' }];
    useSwissGroceriesEligibilityMock.mockReturnValue({ eligible: true, isLoading: false });
    useAbonnementMock.mockReturnValue({ niveau: 'standard', estAuMoins: jest.fn(() => true) });

    const { getByText, queryByText } = await renderAvecProviders();

    expect(getByText('Où faire mes courses ?')).toBeTruthy();
    expect(getByText('En test')).toBeTruthy();
    expect(queryByText('Simulation de panier')).toBeNull();
  });

  it('mode : choisir un mode reserve sans le palier Standard ouvre le paywall', async () => {
    mockStateCoursesStore.items = [{ nom: 'Pommes', coche: false, rayon: 'fruits_legumes' }];
    const { getByText, findByLabelText } = await renderAvecProviders();
    await fireEvent.press(getByText('Équilibré'));
    expect(await findByLabelText('Fermer')).toBeTruthy();
    expect(mockStatePanierStore.setMode).not.toHaveBeenCalled();
  });

  it('mode : prix minimum reste accessible sans palier Standard', async () => {
    mockStateCoursesStore.items = [{ nom: 'Pommes', coche: false, rayon: 'fruits_legumes' }];
    const { getByText } = await renderAvecProviders();
    await fireEvent.press(getByText('Prix minimum'));
    expect(mockStatePanierStore.setMode).toHaveBeenCalledWith('prix_minimum');
  });

  it('validation commande : erreur serveur affiche un toast', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: new Error('echec') }),
    });
    useProfilStore.getState().setProfil(profilBase);
    mockStateCoursesStore.items = [{ nom: 'Pommes', coche: false, rayon: 'fruits_legumes' }];
    mockStatePanierStore.recap = { paniers: [], montant_total: 10, economies: 2 };
    const { getByText } = await renderAvecProviders();
    await fireEvent.press(getByText('Enregistrer la simulation — CHF 10.00'));

    await waitFor(() =>
      expect(toast.erreur).toHaveBeenCalledWith(
        "Impossible d'enregistrer la simulation, réessaie dans un instant",
      ),
    );
  });
});
