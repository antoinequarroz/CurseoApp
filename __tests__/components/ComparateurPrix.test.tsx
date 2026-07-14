import React from 'react';
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ComparateurPrix } from '@/components/courses/ComparateurPrix';
import { ThemeProvider } from '@/lib/theme-context';
import { useProfilStore } from '@/stores/profilStore';

function renderAvecProviders(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>{ui}</ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('ComparateurPrix', () => {
  afterEach(() => useProfilStore.getState().reset());

  it('affiche le paywall pour un utilisateur gratuit', async () => {
    useProfilStore.getState().setProfil({
      id: 'u-1',
      prenom: 'Alex',
      nb_personnes: 1,
      nb_enfants: 0,
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
      cgvu_version_acceptee: null,
    });
    const { getByText } = await renderAvecProviders(<ComparateurPrix produit="Pâtes penne 500g" onChoisirPalier={jest.fn()} />);
    expect(getByText('Débloquer le comparateur de prix →')).toBeTruthy();
  });
});
