import React from 'react';
import { render } from '@testing-library/react-native';
import { ResumeCheckoutMultiEnseignes } from '@/components/courses/ResumeCheckoutMultiEnseignes';
import { ThemeProvider } from '@/lib/theme-context';
import type { BrouillonPanierLive } from '@/stores/panierLiveStore';

const brouillon: BrouillonPanierLive = {
  id: 'b',
  npa: '1003',
  strategie: 'split_cart',
  articlesNonTrouves: [],
  source: 'SwissGroceries',
  collecteLe: '2026-08-19T10:00:00Z',
  adresseId: null,
  livraisons: [],
  paiementEnCours: false,
  creeLe: '2026-08-19T10:00:00Z',
  paniers: [
    {
      enseigne: 'coop',
      articles: [{ id: 'c', produitId: 'c', demande: 'lait', produit: 'Lait', quantite: 1, prixUnitaire: 2 }],
    },
    {
      enseigne: 'migros',
      articles: [{ id: 'm', produitId: 'm', demande: 'pain', produit: 'Pain', quantite: 1, prixUnitaire: 3 }],
    },
  ],
};

describe('ResumeCheckoutMultiEnseignes', () => {
  it('rend chaque panier et distingue les créneaux prêts', async () => {
    const { getByText, getAllByText } = await render(
      <ThemeProvider>
        <ResumeCheckoutMultiEnseignes
          brouillon={brouillon}
          livraisons={[
            {
              enseigne: 'coop',
              id: 'lc',
              libelle: 'Standard',
              prix: 5,
              creneau: { id: 'soir', debut: '2026-08-20T18:00:00Z', fin: '2026-08-20T20:00:00Z', periode: 'soir' },
            },
            { enseigne: 'migros', id: 'lm', libelle: 'Standard', prix: 6 },
          ]}
        />
      </ThemeProvider>,
    );
    expect(getByText('Validation unique')).toBeTruthy();
    expect(getByText('Coop')).toBeTruthy();
    expect(getByText('Migros')).toBeTruthy();
    expect(getAllByText('Panier prêt')).toHaveLength(2);
    expect(getByText('Créneau sélectionné')).toBeTruthy();
    expect(getByText('Créneau à sélectionner')).toBeTruthy();
  });
});
