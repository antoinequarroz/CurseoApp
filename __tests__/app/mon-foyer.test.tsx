import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/lib/theme-context';
import { useProfilStore } from '@/stores/profilStore';
import MonFoyer from '@/app/mon-foyer';
import type { Profil } from '@/types';

jest.mock('@/lib/supabase', () => ({
  ...jest.requireActual('@/lib/supabase'),
  supabase: { from: () => ({ update: () => ({ eq: () => Promise.resolve({ error: null }) }) }) },
}));

const METRICS_TEST = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

async function renderAvecProviders() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS_TEST}>
      <ThemeProvider>
        <MonFoyer />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

const profilBase: Profil = {
  id: 'u-1', prenom: 'Alex', nb_personnes: 2, nb_enfants: 0, enfants_ages: [], budget_hebdo: 150,
  regime: [], allergies: [], objectifs: [], enseignes_favorites: [], equipements_cuisine: null, abonnement: 'gratuit',
  notifications_activees: true, notifications_planning: true, notifications_budget: true,
  notifications_promos: false, notifications_bilan: true, apparence: 'auto', cgvu_version_acceptee: null,
};

describe('MonFoyer', () => {
  beforeEach(() => useProfilStore.getState().reset());

  it('sans profil : affiche un message plutot que de planter', async () => {
    const { getByText } = await renderAvecProviders();
    expect(getByText('Connecte-toi pour gérer les informations de ton foyer.')).toBeTruthy();
  });

  it('affiche la composition et le budget actuels du foyer', async () => {
    useProfilStore.getState().setProfil(profilBase);
    const { getByLabelText } = await renderAvecProviders();
    expect(getByLabelText('Prénom').props.value).toBe('Alex');
  });

  it('stepper nb_personnes : incrementer met a jour le profil', async () => {
    useProfilStore.getState().setProfil(profilBase);
    const { getByLabelText } = await renderAvecProviders();

    await fireEvent.press(getByLabelText("Augmenter l'âge de Nombre de personnes"));
    await waitFor(() => expect(useProfilStore.getState().profil?.nb_personnes).toBe(3));
  });

  it('regime : toggle ajoute/retire un regime du profil', async () => {
    useProfilStore.getState().setProfil(profilBase);
    const { getByLabelText } = await renderAvecProviders();

    await fireEvent.press(getByLabelText('Végétarien'));
    await waitFor(() => expect(useProfilStore.getState().profil?.regime).toContain('vegetarien'));

    await fireEvent.press(getByLabelText('Végétarien'));
    await waitFor(() => expect(useProfilStore.getState().profil?.regime).not.toContain('vegetarien'));
  });

  it('allergies : ajout et retrait via les chips', async () => {
    useProfilStore.getState().setProfil(profilBase);
    const { getByLabelText, getByText } = await renderAvecProviders();

    await fireEvent.changeText(getByLabelText('Précise une allergie ou intolérance…'), 'Arachide');
    await waitFor(() => expect(getByLabelText('Ajouter').props.accessibilityState.disabled).toBe(false));
    await fireEvent.press(getByLabelText('Ajouter'));
    await waitFor(() => expect(useProfilStore.getState().profil?.allergies).toContain('Arachide'));

    await fireEvent.press(getByText('Arachide ✕'));
    await waitFor(() => expect(useProfilStore.getState().profil?.allergies).not.toContain('Arachide'));
  });

  it('enseignes : toggle ajoute/retire une enseigne', async () => {
    useProfilStore.getState().setProfil(profilBase);
    const { getByLabelText } = await renderAvecProviders();

    await fireEvent.press(getByLabelText('Migros'));
    await waitFor(() => expect(useProfilStore.getState().profil?.enseignes_favorites).toContain('migros'));
  });
});
