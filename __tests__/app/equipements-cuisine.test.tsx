import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/lib/theme-context';
import { useProfilStore } from '@/stores/profilStore';
import EquipementsCuisineScreen from '@/app/equipements-cuisine';
import type { Profil } from '@/types';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({ update: () => ({ eq: () => Promise.resolve({ error: null }) }) })),
  },
}));

const profil: Profil = {
  id: 'u-1', prenom: 'Alex', nb_personnes: 2, nb_enfants: 0, enfants_ages: [],
  budget_hebdo: 100, regime: [], allergies: [], objectifs: [], enseignes_favorites: [],
  equipements_cuisine: null, abonnement: 'gratuit', notifications_activees: true,
  notifications_planning: true, notifications_budget: true, notifications_promos: false,
  notifications_bilan: true, apparence: 'auto', cgvu_version_acceptee: null,
};

const METRICS_TEST = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

describe('Équipements de cuisine', () => {
  beforeEach(() => {
    useProfilStore.getState().reset();
    useProfilStore.getState().setProfil(profil);
  });

  it('permet une multiselection accessible et la conserve dans le profil', async () => {
    const ecran = await render(
      <SafeAreaProvider initialMetrics={METRICS_TEST}>
        <ThemeProvider>
          <EquipementsCuisineScreen />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    const four = ecran.getByRole('checkbox', { name: 'Four' });
    expect(four.props.accessibilityState.checked).toBe(false);

    await fireEvent.press(four);
    await waitFor(() => expect(useProfilStore.getState().profil?.equipements_cuisine).toEqual(['four']));
    await fireEvent.press(ecran.getByRole('checkbox', { name: 'Mixeur ou blender' }));

    await waitFor(() => expect(useProfilStore.getState().profil?.equipements_cuisine).toEqual(['four', 'mixeur']));
    expect(ecran.getByRole('checkbox', { name: 'Four' }).props.accessibilityState.checked).toBe(true);
  });
});
