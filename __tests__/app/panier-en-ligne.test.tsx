import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/lib/theme-context';
import PanierEnLigne from '@/app/panier-en-ligne';
import { usePanierLiveStore } from '@/stores/panierLiveStore';
import type { OptimisationCoursesLive, OptionOptimisationCoursesLive } from '@/lib/swissGroceriesRepository';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() } }));
jest.mock('@/hooks/usePreferencesCourses', () => ({
  usePreferencesCourses: () => ({
    data: jest.requireActual('@/lib/preferencesCoursesRepository').PREFERENCES_COURSES_DEFAUT,
  }),
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
          produit: 'Lait écrémé',
          quantite: 1,
          prixUnitaire: 2,
          montant: 2,
          besoinQuantite: 1,
          besoinUnite: 'l',
          nombrePaquets: 1,
          formatCompatible: true,
          pertinence: 'faible',
          validationRequise: true,
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

describe('Panier en ligne', () => {
  beforeEach(() => {
    usePanierLiveStore.getState().reset();
    usePanierLiveStore.getState().creerDepuisOptimisation(resultat, option, '1003');
  });

  it('laisse continuer sans confirmation produit par produit', async () => {
    const ecran = await render(
      <SafeAreaProvider initialMetrics={METRICS}>
        <ThemeProvider>
          <PanierEnLigne />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    await waitFor(() =>
      expect(
        ecran.getByRole('button', { name: 'Choisir l’adresse et la livraison' }).props.accessibilityState.disabled,
      ).toBeFalsy(),
    );
    expect(ecran.queryByText('Confirmer ce produit')).toBeNull();
    expect(ecran.queryByText('Changer')).toBeNull();
  });
});
