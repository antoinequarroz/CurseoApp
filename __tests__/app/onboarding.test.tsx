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
import { toast } from '@/lib/toast';

jest.mock('expo-router', () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock('@/lib/revenuecat', () => ({ initRevenueCat: jest.fn() }));
jest.mock('@/lib/toast', () => ({ toast: { succes: jest.fn(), erreur: jest.fn() } }));
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn(), signOut: jest.fn().mockResolvedValue({ error: null }) },
    from: jest.fn(() => ({ upsert: jest.fn().mockResolvedValue({ error: null }) })),
  },
}));

const METRICS_TEST = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

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
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('succes : etape 1 affiche le titre de bienvenue', async () => {
    const { getByText } = await renderAvecProviders();
    expect(getByText('Bienvenue sur CoursIA')).toBeTruthy();
  });

  it('etape 1 : le bouton Suivant est desactive tant que les CGVU ne sont pas acceptees', async () => {
    const { getByLabelText } = await renderAvecProviders();
    expect(getByLabelText('Suivant').props.accessibilityState?.disabled).toBe(true);
  });

  it('etape 1 : cocher les CGVU coche la case', async () => {
    const { getByRole } = await renderAvecProviders();
    expect(getByRole('checkbox').props.accessibilityState?.checked).toBe(false);

    await fireEvent.press(getByRole('checkbox'));

    await waitFor(() => expect(getByRole('checkbox').props.accessibilityState?.checked).toBe(true));
  });

  it('etape 1 : saisir le prenom met a jour les donnees partielles', async () => {
    const { getByLabelText } = await renderAvecProviders();
    await fireEvent.changeText(getByLabelText('Prénom'), 'Alex');
    expect(useOnboardingStore.getState().donneesPartielles.prenom).toBe('Alex');
  });

  it('finalisation : avec une session, upsert le profil et initialise RevenueCat', async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    (supabase.from as jest.Mock).mockReturnValue({ upsert });
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { user: { id: 'u-1' } } } });
    useOnboardingStore.getState().setEtape(5);
    useOnboardingStore.getState().mettreAJourDonnees({ prenom: 'Alex', enfants_ages: [4, 9] });

    const { getByText } = await renderAvecProviders();
    await fireEvent.press(getByText('Terminer'));

    await waitFor(() => expect(initRevenueCat).toHaveBeenCalledWith('u-1'));
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ id: 'u-1', enfants_ages: [4, 9] }));
    expect(useProfilStore.getState().profil?.prenom).toBe('Alex');
    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
  });

  // COUR-40 : avant ce correctif, finaliser sans session creait un profil
  // local avec l'id litteral 'demo-user' et n'ecrivait rien en base. L'app
  // semblait fonctionner, mais toutes les ecritures serveur suivantes
  // partaient avec un profil_id inexistant (violations de cle etrangere
  // observees en production pendant la recette TestFlight du 29.07).
  it('finalisation : sans session, refuse de finaliser et renvoie vers la connexion', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
    useOnboardingStore.getState().setEtape(5);

    const { getByText } = await renderAvecProviders();
    await fireEvent.press(getByText('Terminer'));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/(auth)/connexion'));
    expect(router.replace).not.toHaveBeenCalledWith('/(tabs)');
    expect(initRevenueCat).not.toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
    // Aucun profil fantome ne doit subsister dans le store.
    expect(useProfilStore.getState().profil).toBeNull();
  });

  it('finalisation : un echec d enregistrement bloque l entree dans l app', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { user: { id: 'u-1' } } } });
    (supabase.from as jest.Mock).mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ error: new Error('reseau') }),
    });
    useOnboardingStore.getState().setEtape(5);

    const { getByText } = await renderAvecProviders();
    await fireEvent.press(getByText('Terminer'));

    await waitFor(() => expect(toast.erreur).toHaveBeenCalled());
    expect(router.replace).not.toHaveBeenCalledWith('/(tabs)');
    expect(useProfilStore.getState().profil).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      '[onboarding] Echec de l enregistrement du profil',
      expect.any(Error),
    );
  });
});
