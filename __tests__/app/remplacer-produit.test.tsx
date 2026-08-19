import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/lib/theme-context';
import RemplacerProduit from '@/app/remplacer-produit';
import { usePanierLiveStore } from '@/stores/panierLiveStore';
import { rechercherProduitsLive } from '@/lib/swissGroceriesRepository';
import type { OptimisationCoursesLive, OptionOptimisationCoursesLive } from '@/lib/swissGroceriesRepository';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: () => mockBack() },
  useLocalSearchParams: () => ({ ligneId: 'coop:lait-1:0', demande: 'lait entier' }),
}));
jest.mock('@/hooks/usePreferencesCourses', () => ({
  usePreferencesCourses: () => ({
    data: jest.requireActual('@/lib/preferencesCoursesRepository').PREFERENCES_COURSES_DEFAUT,
  }),
}));
jest.mock('@/lib/swissGroceriesRepository', () => ({
  ...jest.requireActual('@/lib/swissGroceriesRepository'),
  rechercherProduitsLive: jest.fn(),
}));

const option: OptionOptimisationCoursesLive = {
  id: 'single:coop:2',
  strategie: 'single_store',
  montantTotal: 2,
  articlesNonTrouves: [],
  arrets: [
    {
      enseigne: 'coop',
      montant: 2,
      articles: [
        {
          produitId: 'lait-1',
          demande: 'lait entier',
          produit: 'Lait entier Coop',
          quantite: 1,
          prixUnitaire: 2,
          montant: 2,
          besoinQuantite: 1,
          besoinUnite: 'l',
          nombrePaquets: 1,
          formatCompatible: true,
          pertinence: 'forte',
          validationRequise: false,
          disponibilite: 'resultat_catalogue',
        },
      ],
    },
  ],
};
const resultat: OptimisationCoursesLive = {
  strategie: option.strategie,
  montantTotal: option.montantTotal,
  arrets: option.arrets,
  articlesNonTrouves: [],
  economieEstimee: null,
  source: 'SwissGroceries',
  collecteLe: new Date().toISOString(),
  alternatives: [],
};
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

describe('Remplacer un produit', () => {
  beforeEach(() => {
    mockBack.mockReset();
    usePanierLiveStore.getState().reset();
    usePanierLiveStore.getState().creerDepuisOptimisation(resultat, option, '1003');
    (rechercherProduitsLive as jest.Mock).mockResolvedValue([
      {
        id: 'lait-migros',
        enseigne: 'migros',
        nom: 'Lait entier Migros',
        prix: 2.5,
        format: '1 l',
        taille: { value: 1, unit: 'l' },
        pertinence: 'faible',
        validationRequise: true,
        raisonsCorrespondance: ['variante_a_verifier'],
      },
    ]);
  });

  it('attend une confirmation après la sélection', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const ecran = await render(
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider initialMetrics={METRICS}>
          <ThemeProvider>
            <RemplacerProduit />
          </ThemeProvider>
        </SafeAreaProvider>
      </QueryClientProvider>,
    );

    const choix = await ecran.findByRole('radio', { name: /Choisir Lait entier Migros/ });
    await fireEvent.press(choix);
    expect(usePanierLiveStore.getState().brouillon?.paniers[0]?.articles[0]?.produitId).toBe('lait-1');

    await fireEvent.press(await ecran.findByRole('button', { name: 'Confirmer ce remplacement' }));
    await waitFor(() =>
      expect(usePanierLiveStore.getState().brouillon?.paniers[0]?.articles[0]?.produitId).toBe('lait-migros'),
    );
    expect(usePanierLiveStore.getState().brouillon?.paniers[0]?.articles[0]?.validationUtilisateur).toBe(true);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
