import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ThemeProvider } from '@/lib/theme-context';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useProfilStore } from '@/stores/profilStore';
import Onboarding from '@/app/(auth)/onboarding';
import { supabase } from '@/lib/supabase';
import { initRevenueCat } from '@/lib/revenuecat';

jest.mock('expo-router', () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock('@/lib/revenuecat', () => ({ initRevenueCat: jest.fn() }));
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn() },
    from: jest.fn(() => ({ upsert: jest.fn().mockResolvedValue({ error: null }) })),
  },
}));

const METRICS_TEST = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

async function renderAvecProviders() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS_TEST}>
      <ThemeProvider>
        <Onboarding />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('Onboarding', () => {
  beforeEach(() => {
    useOnboardingStore.getState().reset();
    useProfilStore.getState().reset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('succes : etape 1 affiche le titre de bienvenue', async () => {
    const { getByText } = await renderAvecProviders();
    expect(getByText('Bienvenue sur Coursia')).toBeTruthy();
  });

  it('etape 1 : le bouton Suivant est desactive tant que les CGVU ne sont pas acceptees', async () => {
    const { getByLabelText } = await renderAvecProviders();
    expect(getByLabelText('Suivant').props.accessibilityState?.disabled).toBe(true);
  });

  it('etape 1 : cocher les CGVU coche la case', async () => {
    const { getByRole } = await renderAvecProviders();
    expect(getByRole('checkbox').props.accessibilityState?.checked).toBe(false);

    fireEvent.press(getByRole('checkbox'));

    await waitFor(() => expect(getByRole('checkbox').props.accessibilityState?.checked).toBe(true));
  });

  it('etape 1 : saisir le prenom met a jour les donnees partielles', async () => {
    const { getByLabelText } = await renderAvecProviders();
    fireEvent.changeText(getByLabelText('Prénom'), 'Alex');
    expect(useOnboardingStore.getState().donneesPartielles.prenom).toBe('Alex');
  });

  it('finalisation : avec une session, upsert le profil et initialise RevenueCat', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { user: { id: 'u-1' } } } });
    useOnboardingStore.getState().setEtape(5);
    useOnboardingStore.getState().mettreAJourDonnees({ prenom: 'Alex' });

    const { getByText } = await renderAvecProviders();
    fireEvent.press(getByText('Terminer'));

    await waitFor(() => expect(initRevenueCat).toHaveBeenCalledWith('u-1'));
    expect(useProfilStore.getState().profil?.prenom).toBe('Alex');
    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('finalisation : sans session, cree un profil local sans appeler Supabase ni RevenueCat', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
    useOnboardingStore.getState().setEtape(5);

    const { getByText } = await renderAvecProviders();
    fireEvent.press(getByText('Terminer'));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/(tabs)'));
    expect(initRevenueCat).not.toHaveBeenCalled();
    expect(useProfilStore.getState().profil?.id).toBe('demo-user');
  });
});
