import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/lib/theme-context';
import { useProfilStore } from '@/stores/profilStore';
import { useCoursesStore } from '@/stores/coursesStore';
import { useAbonnement } from '@/hooks/useAbonnement';
import Courses from '@/app/(tabs)/courses';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import type { Profil } from '@/types';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
// eslint-disable-next-line @typescript-eslint/no-require-imports -- require() lazy dans la factory jest.mock, pas d'import statique possible ici.
jest.mock('@react-native-community/netinfo', () => require('@react-native-community/netinfo/jest/netinfo-mock'));
jest.mock('@/hooks/useCoursesSync', () => ({ useCoursesSync: jest.fn() }));
jest.mock('@/hooks/useAbonnement');
jest.mock('@/lib/toast', () => ({ toast: { succes: jest.fn(), erreur: jest.fn(), economies: jest.fn() } }));
jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn(() => ({ insert: jest.fn().mockResolvedValue({ error: null }) })) },
}));

const mockStateCoursesStore = { items: [] as { nom: string; coche: boolean; rayon: string }[], toggleCoche: jest.fn(), ajouterItemLibre: jest.fn(), retirerItem: jest.fn() };
const useCoursesStoreFn = useCoursesStore as unknown as jest.Mock;
jest.mock('@/stores/coursesStore', () => {
  const fn = jest.fn(() => mockStateCoursesStore);
  (fn as unknown as { persist: unknown }).persist = {
    hasHydrated: jest.fn(() => true),
    onFinishHydration: jest.fn(() => () => {}),
  };
  return { useCoursesStore: fn };
});

const mockStatePanierStore = { mode: 'prix_minimum', recap: null as null | { paniers: unknown[]; montant_total: number; economies: number }, setMode: jest.fn(), calculer: jest.fn() };
jest.mock('@/stores/panierStore', () => ({ usePanierStore: jest.fn(() => mockStatePanierStore) }));

const useAbonnementMock = useAbonnement as jest.Mock;

const METRICS_TEST = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

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
  id: 'u-1', prenom: 'Alex', nb_personnes: 2, nb_enfants: 0, enfants_ages: [], budget_hebdo: 150,
  regime: [], allergies: [], objectifs: [], enseignes_favorites: [], abonnement: 'gratuit',
  notifications_activees: true, notifications_planning: true, notifications_budget: true,
  notifications_promos: false, notifications_bilan: true, apparence: 'auto', cgvu_version_acceptee: null,
};

describe('Courses', () => {
  beforeEach(() => {
    useProfilStore.getState().reset();
    mockStateCoursesStore.items = [];
    mockStatePanierStore.mode = 'prix_minimum';
    mockStatePanierStore.recap = null;
    useAbonnementMock.mockReturnValue({ niveau: 'gratuit', estAuMoins: jest.fn(() => false) });
    (useCoursesStoreFn as unknown as { persist: { hasHydrated: jest.Mock } }).persist.hasHydrated.mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('chargement : tant que le store n\'est pas hydrate, affiche le skeleton (pas le vide)', async () => {
    (useCoursesStoreFn as unknown as { persist: { hasHydrated: jest.Mock } }).persist.hasHydrated.mockReturnValue(false);
    const { queryByText } = await renderAvecProviders();
    expect(queryByText('Rien dans ta liste')).toBeNull();
  });

  it('vide : liste vide affiche l\'etat vide', async () => {
    const { getByText } = await renderAvecProviders();
    expect(getByText('Rien dans ta liste')).toBeTruthy();
  });

  it('succes : liste non vide affiche les modes d\'optimisation', async () => {
    mockStateCoursesStore.items = [{ nom: 'Pommes', coche: false, rayon: 'fruits_legumes' }];
    const { getByText } = await renderAvecProviders();
    expect(getByText('Prix minimum')).toBeTruthy();
    expect(getByText('Équilibré')).toBeTruthy();
  });

  it('mode : choisir un mode reserve sans le palier Standard ouvre le paywall', async () => {
    mockStateCoursesStore.items = [{ nom: 'Pommes', coche: false, rayon: 'fruits_legumes' }];
    const { getByText, findByLabelText } = await renderAvecProviders();
    fireEvent.press(getByText('Équilibré'));
    expect(await findByLabelText('Fermer')).toBeTruthy();
    expect(mockStatePanierStore.setMode).not.toHaveBeenCalled();
  });

  it('mode : prix minimum reste accessible sans palier Standard', async () => {
    mockStateCoursesStore.items = [{ nom: 'Pommes', coche: false, rayon: 'fruits_legumes' }];
    const { getByText } = await renderAvecProviders();
    fireEvent.press(getByText('Prix minimum'));
    expect(mockStatePanierStore.setMode).toHaveBeenCalledWith('prix_minimum');
  });

  it('validation commande : erreur serveur affiche un toast', async () => {
    (supabase.from as jest.Mock).mockReturnValue({ insert: jest.fn().mockResolvedValue({ error: new Error('echec') }) });
    useProfilStore.getState().setProfil(profilBase);
    mockStateCoursesStore.items = [{ nom: 'Pommes', coche: false, rayon: 'fruits_legumes' }];
    mockStatePanierStore.recap = { paniers: [], montant_total: 10, economies: 2 };
    const { getByText } = await renderAvecProviders();
    fireEvent.press(getByText('Valider mes courses — CHF 10.00'));

    await waitFor(() => expect(toast.erreur).toHaveBeenCalledWith('Impossible de valider ta commande, réessaie dans un instant'));
  });
});
