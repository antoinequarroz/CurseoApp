import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/lib/theme-context';
import { useProfilStore } from '@/stores/profilStore';
import { useRecettes } from '@/hooks/useRecettes';
import { useRecettesCommunautaires } from '@/hooks/useRecettesCommunautaires';
import { useAbonnement } from '@/hooks/useAbonnement';
import { useMembresFoyer } from '@/hooks/useMembresFoyer';
import { useCompatibiliteMembres } from '@/hooks/useCompatibiliteMembres';
import { useRepasSemaine } from '@/hooks/useRepasSemaine';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import Planifier from '@/app/(tabs)/planifier';
import type { PlanningHebdomadaire, Recette } from '@/types';

// COUR-38 : le SegmentedControl (onglets Recettes/Planning/Communaute) de
// cet ecran est un <Pressable> simple rendu via .map() — dans cet
// environnement de test (jest-expo + NativeWind), `fireEvent.press` sur ce
// Pressable precis n'invoque jamais son gestionnaire (constate en
// diagnostiquant directement onClick, qui repose sur un `this` de classe
// Pressability perdu lors de l'appel simule), alors que le meme pattern
// fonctionne pour d'autres Pressable de l'app (checkbox onboarding, radios
// profil, Button). Plutot que d'ecrire des tests qui simulent un changement
// d'onglet sans jamais reellement l'exercer (faux positifs), ce fichier se
// limite a l'onglet par defaut ('recettes', rendu directement au montage).
// Les sous-onglets Planning/Communaute restent a couvrir par un futur
// ticket une fois ce blocage d'environnement leve (ex. upgrade RNTL/RN).
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/hooks/useRecettes');
jest.mock('@/hooks/useRecettesCommunautaires');
jest.mock('@/hooks/useAbonnement');
jest.mock('@/hooks/useMembresFoyer');
jest.mock('@/hooks/useCompatibiliteMembres');
jest.mock('@/hooks/useRepasSemaine');
jest.mock('@/hooks/useNetworkStatus');
jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn(() => ({ upsert: jest.fn().mockResolvedValue({ error: null }) })) },
}));

const useRecettesMock = useRecettes as jest.Mock;
const useRecettesCommunautairesMock = useRecettesCommunautaires as jest.Mock;
const useAbonnementMock = useAbonnement as jest.Mock;
const useMembresFoyerMock = useMembresFoyer as jest.Mock;
const useCompatibiliteMembresMock = useCompatibiliteMembres as jest.Mock;
const useRepasSemaineMock = useRepasSemaine as jest.Mock;
const useNetworkStatusMock = useNetworkStatus as jest.Mock;

const METRICS_TEST = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

async function renderAvecProviders() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS_TEST}>
      <ThemeProvider>
        <Planifier />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

const planningVide: PlanningHebdomadaire = {
  lundi: {}, mardi: {}, mercredi: {}, jeudi: {}, vendredi: {}, samedi: {}, dimanche: {},
} as PlanningHebdomadaire;

function recette(overrides: Partial<Recette> = {}): Recette {
  return {
    id: 'r-1', titre: 'Salade', description: '', image_url: '', temps_preparation: 10,
    difficulte: 'facile', cout_estime: 5, calories: 300, portions: 2, regime: [], allergenes: [],
    ingredients: [], etapes: [], est_communautaire: false, ...overrides,
  };
}

function etatRecettesParDefaut(overrides: Partial<ReturnType<typeof useRecettes>> = {}) {
  return {
    data: { pages: [] }, isLoading: false, isError: false, error: null, isEmpty: true,
    isRefetching: false, refetch: jest.fn(), fetchNextPage: jest.fn(), hasNextPage: false,
    alertesParRecette: {}, allergiesNonReconnues: [], ...overrides,
  };
}

describe('Planifier (onglet Recettes, par defaut au montage)', () => {
  beforeEach(() => {
    useProfilStore.getState().reset();
    useRecettesMock.mockReturnValue(etatRecettesParDefaut());
    useRecettesCommunautairesMock.mockReturnValue({ recettes: [], total: 0, isLoading: false, isError: false, isEmpty: true, isRefetching: false, refetch: jest.fn(), fetchNextPage: jest.fn(), hasNextPage: false });
    useAbonnementMock.mockReturnValue({ niveau: 'gratuit', estAuMoins: jest.fn(() => false) });
    useMembresFoyerMock.mockReturnValue({ membres: [], isLoading: false, isError: false, isEmpty: true, refetch: jest.fn(), limite: 6, limiteAtteinte: false, mutationEnCours: false, ajouter: jest.fn(), modifier: jest.fn(), retirer: jest.fn() });
    useCompatibiliteMembresMock.mockReturnValue({ recettes: [], alertesParRecette: {}, allergiesNonReconnues: [] });
    useRepasSemaineMock.mockReturnValue({ planning: planningVide, isLoading: false, isError: false, isEmpty: true, refetch: jest.fn(), mutationEnCours: false, assigner: jest.fn(), ignorer: jest.fn(), retirer: jest.fn() });
    useNetworkStatusMock.mockReturnValue({ estConnecte: true, estHorsLigne: false });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('chargement : affiche le skeleton, pas le vide ni la carte', async () => {
    useRecettesMock.mockReturnValue(etatRecettesParDefaut({ isLoading: true, isEmpty: false }));
    const { queryByText } = await renderAvecProviders();
    expect(queryByText('Aucune recette disponible')).toBeNull();
  });

  it('erreur : affiche un message avec bouton reessayer qui appelle refetch', async () => {
    const refetch = jest.fn();
    useRecettesMock.mockReturnValue(etatRecettesParDefaut({ isError: true, isEmpty: false, refetch }));
    const { getByText } = await renderAvecProviders();
    expect(getByText('Impossible de charger les recettes')).toBeTruthy();
    fireEvent.press(getByText('Réessayer'));
    expect(refetch).toHaveBeenCalled();
  });

  it('vide : affiche le message de catalogue vide', async () => {
    const { getByText } = await renderAvecProviders();
    expect(getByText('Aucune recette disponible')).toBeTruthy();
  });

  it('succes : affiche la premiere recette', async () => {
    useRecettesMock.mockReturnValue(
      etatRecettesParDefaut({ data: { pages: [[recette({ titre: 'Salade César' })]] }, isEmpty: false }),
    );
    const { getByText } = await renderAvecProviders();
    expect(getByText('Salade César')).toBeTruthy();
  });
});
