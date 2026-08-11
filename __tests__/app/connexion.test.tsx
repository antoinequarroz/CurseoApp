import React from 'react';
import { render, userEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ThemeProvider } from '@/lib/theme-context';
import { useProfilStore } from '@/stores/profilStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { supabase } from '@/lib/supabase';
import Connexion from '@/app/(auth)/connexion';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('expo-apple-authentication', () => ({
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  AppleAuthenticationButtonType: { SIGN_IN: 0 },
  AppleAuthenticationButtonStyle: { WHITE: 0 },
  AppleAuthenticationButton: () => null,
  signInAsync: jest.fn(),
}));
jest.mock('@/lib/revenuecat', () => ({ initRevenueCat: jest.fn() }));
jest.mock('@/lib/toast', () => ({ toast: { succes: jest.fn(), erreur: jest.fn() } }));

const mockMaybeSingle = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signInWithIdToken: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({ maybeSingle: mockMaybeSingle })),
      })),
    })),
  },
}));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

async function afficherConnexion() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ThemeProvider>
        <Connexion />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('Connexion', () => {
  beforeEach(() => {
    useProfilStore.getState().reset();
    useOnboardingStore.getState().reset();
    mockMaybeSingle.mockReset();
  });

  afterEach(() => jest.clearAllMocks());

  it('permet de passer en creation de compte', async () => {
    const { getByText, findByText } = await afficherConnexion();
    await userEvent.press(getByText("Pas encore de compte ? S'inscrire"));
    expect(await findByText('Créer mon compte')).toBeTruthy();
  });

  it('un nouveau compte sans profil poursuit vers onboarding', async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: 'u-1' } } },
      error: null,
    });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const { getByText, getByLabelText, findByText } = await afficherConnexion();
    await userEvent.press(getByText("Pas encore de compte ? S'inscrire"));
    await findByText('Créer mon compte');
    await userEvent.type(getByLabelText('Adresse email'), 'alex@example.com');
    await userEvent.type(getByLabelText('Mot de passe'), 'motdepasse-solide');
    await userEvent.press(getByText('Créer mon compte'));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/(auth)/onboarding'));
  });

  it('un compte avec profil existant poursuit vers les onglets', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { user: { id: 'u-1' } },
      error: null,
    });
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'u-1',
        prenom: 'Alex',
        nb_personnes: 1,
        nb_enfants: 0,
        enfants_ages: [],
        budget_hebdo: 100,
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
        cgvu_version_acceptee: '1.0',
      },
      error: null,
    });
    const { getByText, getByLabelText } = await afficherConnexion();
    await userEvent.type(getByLabelText('Adresse email'), 'alex@example.com');
    await userEvent.type(getByLabelText('Mot de passe'), 'motdepasse-solide');
    await userEvent.press(getByText('Se connecter'));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/(tabs)'));
    expect(useProfilStore.getState().profil?.id).toBe('u-1');
    expect(useOnboardingStore.getState().estComplete).toBe(true);
  });
});
