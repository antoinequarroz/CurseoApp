import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePrix } from '@/hooks/usePrix';
import * as prixRepository from '@/lib/prixRepository';
import type { ComparatifPrixReel, OffrePrix } from '@/lib/prixRepository';

jest.mock('@/lib/prixRepository');
// Force isSupabaseConfigured=true pour ce fichier, meme raison qu'en COUR-19
// (useRecettes.test.tsx) : le cas "non configure" est teste a part dans
// usePrix.sansSupabase.test.tsx, sans mock du module (booleen expose comme
// const, pas fiable a faire varier au sein d'un meme fichier avec le
// hoisting de jest.mock).
jest.mock('@/lib/supabase', () => ({
  ...jest.requireActual('@/lib/supabase'),
  isSupabaseConfigured: true,
}));

const fetchComparatifPrixMock = prixRepository.fetchComparatifPrix as jest.Mock;

function offre(overrides: Partial<OffrePrix>): OffrePrix {
  return {
    offreId: 'o-1',
    enseigne: 'migros',
    format: '1kg',
    quantite: 1,
    unite: 'kg',
    prix: 4.2,
    prixUnitaire: 4.2,
    promotion: null,
    source: 'saisie_manuelle',
    collecteLe: new Date().toISOString(),
    ...overrides,
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('usePrix', () => {
  beforeEach(() => fetchComparatifPrixMock.mockReset());

  it('succes : expose les offres triees avec formats differents', async () => {
    const comparatif: ComparatifPrixReel = {
      produitCanoniqueId: 'p-1',
      nom: 'Riz basmati',
      offres: [
        offre({ offreId: 'o-1kg', enseigne: 'migros', format: '1kg', quantite: 1, unite: 'kg', prix: 4.2, prixUnitaire: 4.2 }),
        offre({ offreId: 'o-500g', enseigne: 'migros', format: '500g', quantite: 0.5, unite: 'kg', prix: 2.3, prixUnitaire: 4.6 }),
        offre({ offreId: 'o-coop', enseigne: 'coop', format: '1kg', quantite: 1, unite: 'kg', prix: 4.35, prixUnitaire: 4.35 }),
      ],
      meilleurPrixUnitaire: 4.2,
    };
    fetchComparatifPrixMock.mockResolvedValue(comparatif);

    const { result } = await renderHook(() => usePrix('Riz basmati'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.offres).toHaveLength(3);
    expect(result.current.data?.offres.map((o) => o.format)).toEqual(['1kg', '500g', '1kg']);
  });

  it('promotion : la promotion d\'une offre est preservee', async () => {
    fetchComparatifPrixMock.mockResolvedValue({
      produitCanoniqueId: 'p-1',
      nom: 'Riz basmati',
      offres: [offre({ promotion: '-7%' })],
      meilleurPrixUnitaire: 4.2,
    } satisfies ComparatifPrixReel);

    const { result } = await renderHook(() => usePrix('Riz basmati'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.offres[0]?.promotion).toBe('-7%');
  });

  it('egalite : plusieurs offres peuvent partager le meilleur prix unitaire', async () => {
    fetchComparatifPrixMock.mockResolvedValue({
      produitCanoniqueId: 'p-1',
      nom: 'Riz basmati',
      offres: [
        offre({ offreId: 'o-a', enseigne: 'migros', prixUnitaire: 4.2 }),
        offre({ offreId: 'o-b', enseigne: 'coop', prixUnitaire: 4.2 }),
        offre({ offreId: 'o-c', enseigne: 'lidl', prixUnitaire: 5 }),
      ],
      meilleurPrixUnitaire: 4.2,
    } satisfies ComparatifPrixReel);

    const { result } = await renderHook(() => usePrix('Riz basmati'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const meilleures = result.current.data?.offres.filter((o) => o.prixUnitaire === result.current.data?.meilleurPrixUnitaire);
    expect(meilleures).toHaveLength(2);
  });

  it('donnees manquantes : produit non trouve (null) distinct de "aucun prix" (offres vides)', async () => {
    fetchComparatifPrixMock.mockResolvedValue(null);
    const { result: resultNonTrouve } = await renderHook(() => usePrix('Produit inconnu'), { wrapper });
    await waitFor(() => expect(resultNonTrouve.current.isLoading).toBe(false));
    expect(resultNonTrouve.current.data).toBeNull();

    fetchComparatifPrixMock.mockResolvedValue({
      produitCanoniqueId: 'p-2',
      nom: 'Produit sans prix',
      offres: [],
      meilleurPrixUnitaire: null,
    } satisfies ComparatifPrixReel);
    const { result: resultVide } = await renderHook(() => usePrix('Produit sans prix'), { wrapper });
    await waitFor(() => expect(resultVide.current.isLoading).toBe(false));
    expect(resultVide.current.data?.offres).toHaveLength(0);
  });
});
