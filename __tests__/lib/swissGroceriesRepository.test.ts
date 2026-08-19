import { supabase } from '@/lib/supabase';
import {
  fetchSwissGroceriesEligibility,
  fetchComparatifPrixLive,
  optimiserListeCoursesLive,
  rechercherProduitsLive,
  swissGroceriesBuildEnabled,
} from '@/lib/swissGroceriesRepository';
import type { ItemCourse } from '@/types';

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { swissGroceriesEnabled: true } },
}));

jest.mock('@/lib/supabase', () => ({
  supabase: { functions: { invoke: jest.fn() } },
}));

const mockInvoke = supabase.functions.invoke as jest.Mock;

describe('swissGroceriesRepository', () => {
  beforeEach(() => mockInvoke.mockReset());

  it('reste active uniquement via le feature flag Expo', () => {
    expect(swissGroceriesBuildEnabled).toBe(true);
  });

  it('demande au serveur si le compte courant appartient au canary', async () => {
    mockInvoke.mockResolvedValue({ error: null, data: { eligible: true } });

    await expect(fetchSwissGroceriesEligibility()).resolves.toBe(true);
    expect(mockInvoke).toHaveBeenCalledWith('swissgroceries', {
      body: { action: 'eligibility' },
    });
  });

  it('refuse une reponse d eligibilite ambigue', async () => {
    mockInvoke.mockResolvedValue({ error: null, data: { enabled: true } });
    await expect(fetchSwissGroceriesEligibility()).rejects.toBeTruthy();
  });

  it('normalise le meilleur match de chaque enseigne et trie au prix unitaire', async () => {
    mockInvoke.mockResolvedValue({
      error: null,
      data: {
        byChain: {
          migros: [
            {
              id: 'm-1',
              name: 'Lait entier',
              brand: 'M-Classic',
              size: { value: 1, unit: 'l' },
              price: { current: 1.8, currency: 'CHF' },
              unitPrice: { value: 1.8, per: 'l' },
            },
          ],
          coop: [
            {
              id: 'c-1',
              name: 'Lait entier',
              brand: 'Prix Garantie',
              size: { value: 1, unit: 'l' },
              price: { current: 1.6, currency: 'CHF' },
              unitPrice: { value: 1.6, per: 'l' },
              promotion: { description: '-10%' },
            },
          ],
        },
      },
    });

    const resultat = await fetchComparatifPrixLive('lait');

    expect(mockInvoke).toHaveBeenCalledWith('swissgroceries', {
      body: {
        action: 'search',
        query: 'lait',
        chains: ['migros', 'coop', 'aldi', 'lidl', 'ottos'],
        limit: 4,
      },
    });
    expect(resultat?.offres.map((offre) => offre.enseigne)).toEqual(['coop', 'migros']);
    expect(resultat?.offres[0]).toMatchObject({
      prix: 1.6,
      prixUnitaire: 1.6,
      promotion: '-10%',
      source: 'SwissGroceries (live)',
    });
    expect(resultat?.meilleurPrixUnitaire).toBe(1.6);
  });

  it('retourne null quand aucune enseigne ne fournit un prix exploitable', async () => {
    mockInvoke.mockResolvedValue({ error: null, data: { byChain: { coop: [] } } });
    await expect(fetchComparatifPrixLive('inconnu')).resolves.toBeNull();
  });

  it('retourne les alternatives de remplacement triées par prix', async () => {
    mockInvoke.mockResolvedValue({
      error: null,
      data: {
        byChain: {
          migros: [
            {
              id: 'm-1',
              name: 'Lait entier',
              brand: 'M-Classic',
              size: { value: 1, unit: 'l' },
              price: { current: 1.8, currency: 'CHF' },
            },
          ],
          coop: [
            {
              id: 'c-1',
              name: 'Lait entier',
              brand: 'Prix Garantie',
              size: { value: 1, unit: 'l' },
              price: { current: 1.6, currency: 'CHF' },
            },
          ],
        },
      },
    });

    await expect(rechercherProduitsLive('lait')).resolves.toEqual([
      expect.objectContaining({ id: 'c-1', enseigne: 'coop', prix: 1.6 }),
      expect.objectContaining({ id: 'm-1', enseigne: 'migros', prix: 1.8 }),
    ]);
  });

  it('propage une erreur du proxy pour que React Query affiche le repli UI', async () => {
    const error = new Error('gateway indisponible');
    mockInvoke.mockResolvedValue({ error, data: null });
    await expect(fetchComparatifPrixLive('lait')).rejects.toBe(error);
  });

  it('optimise uniquement les articles non coches et calcule une economie comparable', async () => {
    mockInvoke.mockResolvedValue({
      error: null,
      data: {
        meta: { source: 'SwissGroceries', collectedAt: '2026-08-10T12:34:00.000Z' },
        primary: {
          strategy: 'absolute_cheapest',
          totalChf: 7.5,
          stops: [
            {
              store: { chain: 'migros', id: 'store-1', name: 'Migros Lausanne' },
              subtotalChf: 7.5,
              items: [
                {
                  requested: { query: 'pommes', quantity: 1 },
                  matched: {
                    chain: 'migros',
                    id: 'p-1',
                    name: 'Pommes Gala',
                    brand: 'TerraSuisse',
                    size: { value: 1, unit: 'kg' },
                    price: { current: 3.5, currency: 'CHF' },
                  },
                  lineTotal: 3.5,
                },
              ],
            },
          ],
          unmatchedItems: [{ query: 'papier cuisson' }],
        },
        alternatives: [
          {
            strategy: 'single_store',
            totalChf: 10,
            stops: [],
            unmatchedItems: [],
          },
        ],
      },
    });
    const items: ItemCourse[] = [
      { id: '1', produit: 'pommes', quantite: 500, unite: 'g', rayon: 'Fruits & Legumes', coche: false },
      { id: '2', produit: 'lait', quantite: 2, unite: 'unite', rayon: 'Produits laitiers', coche: true },
    ];

    const resultat = await optimiserListeCoursesLive({
      items,
      npa: '1003',
      mode: 'prix_minimum',
      enseignesFavorites: ['migros', 'manor_food'],
    });

    expect(mockInvoke).toHaveBeenCalledWith('swissgroceries', {
      body: expect.objectContaining({
        action: 'plan',
        items: [{ query: 'pommes', quantity: 1 }],
        near: { zip: '1003' },
        chains: ['migros'],
        strategy: 'absolute_cheapest',
      }),
    });
    expect(resultat).toMatchObject({
      montantTotal: 7.5,
      economieEstimee: 2.5,
      source: 'SwissGroceries',
      collecteLe: '2026-08-10T12:34:00.000Z',
      articlesNonTrouves: ['papier cuisson'],
      arrets: [
        {
          enseigne: 'migros',
          montant: 7.5,
          articles: [{ produitId: 'p-1', quantite: 1, prixUnitaire: 3.5 }],
        },
      ],
      alternatives: [{ strategie: 'single_store', montantTotal: 10 }],
    });
  });

  it('ajoute le filtre bio et propage une reponse MCP invalide', async () => {
    mockInvoke.mockResolvedValueOnce({ error: null, data: { invalid: true } });
    const items: ItemCourse[] = [
      { id: '1', produit: 'lait', quantite: 1, unite: 'l', rayon: 'Produits laitiers', coche: false },
    ];

    await expect(optimiserListeCoursesLive({ items, npa: '1003', mode: 'bio' })).rejects.toBeTruthy();
    expect(mockInvoke).toHaveBeenCalledWith('swissgroceries', {
      body: expect.objectContaining({
        strategy: 'split_cart',
        items: [{ query: 'lait', quantity: 1, filters: { tags: ['organic'] } }],
      }),
    });
  });
});
