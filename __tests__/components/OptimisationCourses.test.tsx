import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@/lib/theme-context';
import { OptimisationCourses } from '@/components/courses/OptimisationCourses';
import { optimiserListeCoursesLive } from '@/lib/swissGroceriesRepository';
import type { ItemCourse } from '@/types';

jest.mock('@react-native-community/netinfo', () =>
  jest.requireActual('@react-native-community/netinfo/jest/netinfo-mock'),
);
jest.mock('@/lib/swissGroceriesRepository', () => ({
  optimiserListeCoursesLive: jest.fn(),
}));

const optimiserMock = optimiserListeCoursesLive as jest.Mock;
const items: ItemCourse[] = [
  { id: '1', produit: 'pommes', quantite: 1, unite: 'kg', rayon: 'Fruits & Legumes', coche: false },
];

async function afficher(estStandard = true, onDebloquer = jest.fn()) {
  return render(
    <ThemeProvider>
      <OptimisationCourses
        items={items}
        mode="prix_minimum"
        enseignesFavorites={[]}
        estStandard={estStandard}
        onDebloquer={onDebloquer}
        onPreparerPaniers={jest.fn()}
      />
    </ThemeProvider>,
  );
}

describe('OptimisationCourses', () => {
  beforeEach(() => optimiserMock.mockReset());

  it('explique le besoin et refuse un NPA incomplet', async () => {
    const { getByText, getByPlaceholderText } = await afficher();
    expect(getByText('Où faire mes courses ?')).toBeTruthy();
    await fireEvent.changeText(getByPlaceholderText('Ex. 1003'), '10');
    await fireEvent.press(getByText('Optimiser ma liste'));
    await waitFor(() => expect(getByText('Indique un NPA suisse à quatre chiffres.')).toBeTruthy());
    expect(optimiserMock).not.toHaveBeenCalled();
  });

  it('ouvre le déblocage pour un compte gratuit', async () => {
    const onDebloquer = jest.fn();
    const { getByText } = await afficher(false, onDebloquer);
    await fireEvent.press(getByText("Débloquer l'optimisation"));
    expect(onDebloquer).toHaveBeenCalledTimes(1);
  });

  it('affiche le parcours multi-enseignes et les articles non trouvés', async () => {
    optimiserMock.mockResolvedValue({
      strategie: 'absolute_cheapest',
      montantTotal: 7.5,
      economieEstimee: 2.5,
      source: 'SwissGroceries',
      collecteLe: '2026-08-10T12:34:00.000Z',
      articlesNonTrouves: ['papier cuisson'],
      arrets: [
        {
          enseigne: 'migros',
          magasin: 'Migros Lausanne',
          montant: 7.5,
          articles: [
            {
              demande: 'pommes',
              produit: 'Pommes Gala',
              marque: 'TerraSuisse',
              format: '1 kg',
              montant: 7.5,
            },
          ],
        },
      ],
    });
    const { getByText, getAllByText, getByPlaceholderText } = await afficher();
    await fireEvent.changeText(getByPlaceholderText('Ex. 1003'), '1003');
    await fireEvent.press(getByText('Optimiser ma liste'));

    await waitFor(() => expect(getAllByText('CHF 7.50')).toHaveLength(3));
    expect(getByText('Migros')).toBeTruthy();
    expect(getByText('Pommes Gala')).toBeTruthy();
    expect(getByText('1 article(s) à choisir sur place')).toBeTruthy();
    expect(getByText('Source : SwissGroceries · relevé le 10 août à 14:34')).toBeTruthy();
    expect(optimiserMock).toHaveBeenCalledWith(expect.objectContaining({ npa: '1003', items }));
  });

  it('conserve le résultat horodaté si son actualisation échoue', async () => {
    optimiserMock
      .mockResolvedValueOnce({
        strategie: 'absolute_cheapest',
        montantTotal: 7.5,
        economieEstimee: null,
        source: 'SwissGroceries',
        collecteLe: '2026-08-10T12:34:00.000Z',
        articlesNonTrouves: [],
        arrets: [
          {
            enseigne: 'migros',
            magasin: 'Migros Lausanne',
            montant: 7.5,
            articles: [{ demande: 'pommes', produit: 'Pommes Gala', montant: 7.5 }],
          },
        ],
      })
      .mockRejectedValueOnce(new Error('gateway indisponible'));
    const { getByText, getByPlaceholderText } = await afficher();
    await fireEvent.changeText(getByPlaceholderText('Ex. 1003'), '1003');
    await fireEvent.press(getByText('Optimiser ma liste'));
    await waitFor(() => expect(getByText('Pommes Gala')).toBeTruthy());

    await fireEvent.press(getByText('Optimiser ma liste'));
    await waitFor(() =>
      expect(
        getByText(
          'Impossible d’actualiser les prix. Le résultat précédent reste affiché avec son heure de collecte.',
        ),
      ).toBeTruthy(),
    );
    expect(getByText('Pommes Gala')).toBeTruthy();
    expect(getByText('Source : SwissGroceries · relevé le 10 août à 14:34')).toBeTruthy();
  });
});
