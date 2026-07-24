import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRecettes } from '@/hooks/useRecettes';
import * as recettesRepository from '@/lib/recettesRepository';
import * as allergenesRepository from '@/lib/allergenesRepository';
import type { AllergeneEffectif, Recette } from '@/types';

jest.mock('@/lib/recettesRepository');
jest.mock('@/lib/allergenesRepository');
// Force isSupabaseConfigured=true pour ce fichier : ces tests couvrent le
// vrai parcours "backend joignable" (succes/vide/erreur/refetch/filtres).
// Le cas "Supabase non configure -> repli sur RECETTES_MOCK" est teste a
// part, dans useRecettes.sansSupabase.test.tsx, qui laisse le vrai module
// (isSupabaseConfigured=false par defaut en environnement de test, aucune
// config Expo chargee) plutot que de tenter de faire varier ce booleen
// dans un seul fichier — un booleen expose comme const, pas comme
// fonction/module mockable proprement, n'est pas fiable a faire varier au
// sein d'un meme fichier de tests avec le hoisting de jest.mock.
jest.mock('@/lib/supabase', () => ({
  ...jest.requireActual('@/lib/supabase'),
  isSupabaseConfigured: true,
}));

const fetchRecettesPublieesMock = recettesRepository.fetchRecettesPubliees as jest.Mock;
const fetchSynonymesAllergenesMock = allergenesRepository.fetchSynonymesAllergenes as jest.Mock;

// Referentiel de synonymes (COUR-15) minimal pour les tests COUR-22 : reprend
// quelques entrees reelles du seed (accents, pluriels, termes composes).
const SYNONYMES_TEST = [
  { terme: 'arachide', code: 'arachide' },
  { terme: 'cacahuete', code: 'arachide' },
  { terme: 'cacahuetes', code: 'arachide' },
  { terme: 'fruits_a_coque', code: 'fruits_a_coque' },
  { terme: 'noix de cajou', code: 'fruits_a_coque' },
  { terme: 'noisette', code: 'fruits_a_coque' },
  { terme: 'gluten', code: 'gluten' },
  { terme: 'ble', code: 'gluten' },
  { terme: 'lactose', code: 'lactose' },
];

function effectif(overrides: Partial<AllergeneEffectif>): AllergeneEffectif {
  return { code: 'gluten', libelle: 'Gluten', source: 'declare', certitude: 'confirme', ...overrides };
}

function recette(overrides: Partial<Recette>): Recette {
  return {
    id: 'r-test',
    titre: 'Recette test',
    description: '',
    image_url: '',
    temps_preparation: 20,
    difficulte: 'facile',
    cout_estime: 10,
    calories: 400,
    portions: 2,
    regime: [],
    allergenes: [],
    ingredients: [],
    etapes: [],
    est_communautaire: false,
    ...overrides,
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useRecettes', () => {
  beforeEach(() => {
    fetchRecettesPublieesMock.mockReset();
    fetchSynonymesAllergenesMock.mockReset();
    fetchSynonymesAllergenesMock.mockResolvedValue(SYNONYMES_TEST);
  });

  it('succes : expose les recettes publiees une fois chargees', async () => {
    fetchRecettesPublieesMock.mockResolvedValue([recette({ id: 'r-1' }), recette({ id: 'r-2' })]);

    const { result } = await renderHook(() => useRecettes(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(false);
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.data.pages.flat()).toHaveLength(2);
  });

  it('vide : isEmpty passe a true quand le catalogue distant est vide (pas de repli sur les mocks)', async () => {
    fetchRecettesPublieesMock.mockResolvedValue([]);

    const { result } = await renderHook(() => useRecettes(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(false);
    expect(result.current.isEmpty).toBe(true);
    expect(result.current.data.pages.flat()).toHaveLength(0);
  });

  it('erreur : isError passe a true sans jamais afficher RECETTES_MOCK a la place', async () => {
    fetchRecettesPublieesMock.mockRejectedValue(new Error('reseau indisponible'));

    const { result } = await renderHook(() => useRecettes(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.data.pages.flat()).toHaveLength(0);
  });

  it('rafraichissement : refetch() relance un appel reseau et met a jour les donnees', async () => {
    fetchRecettesPublieesMock.mockResolvedValueOnce([recette({ id: 'r-1' })]);

    const { result } = await renderHook(() => useRecettes(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data.pages.flat()).toHaveLength(1);

    fetchRecettesPublieesMock.mockResolvedValueOnce([recette({ id: 'r-1' }), recette({ id: 'r-2' })]);
    await result.current.refetch();

    await waitFor(() => expect(result.current.data.pages.flat()).toHaveLength(2));
    expect(fetchRecettesPublieesMock).toHaveBeenCalledTimes(2);
  });

  it('filtre par regime et pagine cote client (PAGE_SIZE=10)', async () => {
    const recettesVegetariennes = Array.from({ length: 12 }, (_, i) =>
      recette({ id: `veg-${i}`, regime: ['vegetarien'] }),
    );
    fetchRecettesPublieesMock.mockResolvedValue([
      ...recettesVegetariennes,
      recette({ id: 'viande-1', regime: [] }),
    ]);

    const { result } = await renderHook(() => useRecettes({ regime: ['vegetarien'] }), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data.pages[0]).toHaveLength(10);
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => result.current.fetchNextPage());
    await waitFor(() => expect(result.current.data.pages).toHaveLength(2));
    expect(result.current.data.pages.flat()).toHaveLength(12);
    expect(result.current.hasNextPage).toBe(false);
  });

  describe('COUR-22 : filtrage allergies robuste', () => {
    it('correspondance exacte (code canonique) confirmee : la recette est exclue', async () => {
      fetchRecettesPublieesMock.mockResolvedValue([
        recette({ id: 'r-gluten', allergenesEffectifs: [effectif({ code: 'gluten', certitude: 'confirme' })] }),
        recette({ id: 'r-safe', allergenesEffectifs: [] }),
      ]);

      const { result } = await renderHook(() => useRecettes({ allergies: ['gluten'] }), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data.pages.flat().map((r) => r.id)).toEqual(['r-safe']);
    });

    it('synonyme + accent + casse ("Cacahuète") resout vers arachide et exclut la recette', async () => {
      fetchRecettesPublieesMock.mockResolvedValue([
        recette({ id: 'r-arachide', allergenesEffectifs: [effectif({ code: 'arachide', libelle: 'Arachides', certitude: 'confirme' })] }),
        recette({ id: 'r-safe', allergenesEffectifs: [] }),
      ]);

      const { result } = await renderHook(() => useRecettes({ allergies: ['Cacahuète'] }), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data.pages.flat().map((r) => r.id)).toEqual(['r-safe']);
      expect(result.current.allergiesNonReconnues).toEqual([]);
    });

    it('pluriel non seede explicitement ("noisettes") se resout via le repli singulier du referentiel', async () => {
      fetchRecettesPublieesMock.mockResolvedValue([
        recette({ id: 'r-noisette', allergenesEffectifs: [effectif({ code: 'fruits_a_coque', certitude: 'confirme' })] }),
      ]);

      const { result } = await renderHook(() => useRecettes({ allergies: ['noisettes'] }), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data.pages.flat()).toHaveLength(0);
      expect(result.current.allergiesNonReconnues).toEqual([]);
    });

    it('terme compose ("noix de cajou") resout vers fruits_a_coque et exclut la recette', async () => {
      fetchRecettesPublieesMock.mockResolvedValue([
        recette({ id: 'r-cajou', allergenesEffectifs: [effectif({ code: 'fruits_a_coque', certitude: 'confirme' })] }),
        recette({ id: 'r-safe', allergenesEffectifs: [] }),
      ]);

      const { result } = await renderHook(() => useRecettes({ allergies: ['noix de cajou'] }), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data.pages.flat().map((r) => r.id)).toEqual(['r-safe']);
    });

    it('match "possible" seulement (deduction ambigue) : jamais exclue, mais toujours signalee', async () => {
      fetchRecettesPublieesMock.mockResolvedValue([
        recette({ id: 'r-ambigu', allergenesEffectifs: [effectif({ code: 'gluten', libelle: 'Gluten', source: 'deduit', certitude: 'possible' })] }),
      ]);

      const { result } = await renderHook(() => useRecettes({ allergies: ['gluten'] }), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data.pages.flat().map((r) => r.id)).toEqual(['r-ambigu']);
      expect(result.current.alertesParRecette['r-ambigu']).toEqual([{ code: 'gluten', libelle: 'Gluten' }]);
    });

    it('allergie saisie non reconnue par le referentiel : signalee explicitement, ne filtre aucune recette pour ce terme', async () => {
      fetchRecettesPublieesMock.mockResolvedValue([
        recette({ id: 'r-1', allergenesEffectifs: [] }),
        recette({ id: 'r-2', allergenesEffectifs: [effectif({ code: 'gluten', certitude: 'confirme' })] }),
      ]);

      const { result } = await renderHook(() => useRecettes({ allergies: ['terme_inconnu_xyz'] }), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.allergiesNonReconnues).toEqual(['terme_inconnu_xyz']);
      expect(result.current.data.pages.flat().map((r) => r.id)).toEqual(['r-1', 'r-2']);
    });

    it('ingredient catalogue (allergenesEffectifs) exclut meme sans declaration explicite sur allergenes', async () => {
      fetchRecettesPublieesMock.mockResolvedValue([
        recette({
          id: 'r-deduit',
          allergenes: [],
          allergenesEffectifs: [effectif({ code: 'lactose', libelle: 'Lait / lactose', source: 'deduit', certitude: 'confirme' })],
        }),
      ]);

      const { result } = await renderHook(() => useRecettes({ allergies: ['lactose'] }), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data.pages.flat()).toHaveLength(0);
    });
  });
});
