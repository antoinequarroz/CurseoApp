import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ThemeProvider } from '@/lib/theme-context';
import { useProfilStore } from '@/stores/profilStore';
import { useCoursesStore } from '@/stores/coursesStore';
import { useRepasSemaine } from '@/hooks/useRepasSemaine';
import { useBudgetSemaine } from '@/hooks/useBudgetSemaine';
import Accueil from '@/app/(tabs)/index';
import type { Profil, PlanningHebdomadaire } from '@/types';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/hooks/useRepasSemaine');
jest.mock('@/hooks/useBudgetSemaine');
jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn(() => ({ upsert: jest.fn().mockResolvedValue({ error: null }) })) },
}));

const useRepasSemaineMock = useRepasSemaine as jest.Mock;
const useBudgetSemaineMock = useBudgetSemaine as jest.Mock;

const METRICS_TEST = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

async function renderAvecProviders() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS_TEST}>
      <ThemeProvider>
        <Accueil />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

const planningVide: PlanningHebdomadaire = {
  lundi: {}, mardi: {}, mercredi: {}, jeudi: {}, vendredi: {}, samedi: {}, dimanche: {},
} as PlanningHebdomadaire;

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
  abonnement: 'gratuit',
  notifications_activees: true,
  notifications_planning: true,
  notifications_budget: true,
  notifications_promos: false,
  notifications_bilan: true,
  apparence: 'auto',
  cgvu_version_acceptee: null,
};

describe('Accueil', () => {
  beforeEach(() => {
    useProfilStore.getState().reset();
    useRepasSemaineMock.mockReturnValue({ planning: planningVide, isLoading: false, isError: false, isEmpty: true, refetch: jest.fn() });
    useBudgetSemaineMock.mockReturnValue({ isLoading: false, budgetConsomme: 0, economiesCumulees: 0, dernieresCommandes: [], meilleureEnseigne: null, aDesCommandes: false });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('succes : sans profil, affiche une salutation par defaut et le budget hebdo par defaut', async () => {
    const { getByText } = await renderAvecProviders();
    expect(getByText('Bonjour toi')).toBeTruthy();
    expect(getByText('CHF 150.00')).toBeTruthy();
  });

  it('succes : avec un profil, affiche le prenom et le budget restant (budget - consomme)', async () => {
    useProfilStore.getState().setProfil(profilBase);
    useBudgetSemaineMock.mockReturnValue({ isLoading: false, budgetConsomme: 40, economiesCumulees: 12, dernieresCommandes: [], meilleureEnseigne: null, aDesCommandes: true });
    const { getByText } = await renderAvecProviders();
    expect(getByText(/Alex/)).toBeTruthy();
    expect(getByText('CHF 110.00')).toBeTruthy();
  });

  it('notifications : le clic sur la cloche navigue vers le profil', async () => {
    const { getByLabelText } = await renderAvecProviders();
    fireEvent.press(getByLabelText('Notifications'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/profil');
  });

  it('generer courses : sans planning rempli, navigue quand meme vers Courses', async () => {
    useProfilStore.getState().setProfil(profilBase);
    const genererDepuisPlanning = jest.spyOn(useCoursesStore.getState(), 'genererDepuisPlanning').mockImplementation(() => {});
    const { getByText } = await renderAvecProviders();
    fireEvent.press(getByText('Générer mes courses'));

    expect(genererDepuisPlanning).toHaveBeenCalledWith(planningVide, profilBase);
    expect(router.push).toHaveBeenCalledWith('/(tabs)/courses');
    genererDepuisPlanning.mockRestore();
  });

  it('economies : ouvre la synthese depuis la carte de l accueil', async () => {
    const { getByLabelText } = await renderAvecProviders();
    fireEvent.press(getByLabelText('Économies cumulées'));

    expect(router.push).toHaveBeenCalledWith('/economies');
  });
});
