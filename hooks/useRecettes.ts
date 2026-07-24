/**
 * COUR-19 : catalogue de recettes 100% Supabase dans le parcours de
 * production — RECETTES_MOCK n'est utilise QUE si Supabase n'est pas
 * configure du tout (poste de dev sans backend), jamais comme repli
 * silencieux sur une erreur reseau ou un catalogue distant vide : ces deux
 * cas doivent rester visibles (isError / isEmpty) pour que l'UI les
 * affiche explicitement plutot que de montrer de fausses donnees.
 *
 * Chargement/vide/erreur : portes par useQuery (isLoading/isError/error),
 * pas re-invente a la main.
 * Cache/rafraichissement : useQuery gere la deduplication et le cache par
 * queryKey — un seul fetch reseau tant que staleTime n'est pas ecoule ou
 * qu'un refetch() explicite n'est pas demande (pull-to-refresh).
 * Mode degrade : networkMode 'offlineFirst' herite de lib/queryClient.ts
 * (config globale) — en cas de perte reseau, les dernieres donnees en
 * cache memoire restent affichees plutot qu'un ecran d'erreur brutal.
 * Pagination/filtres : le catalogue reste petit (des dizaines de recettes,
 * pas des milliers) — un seul fetch complet des recettes publiees, filtre
 * et pagine cote client. Filtrage/pagination cote serveur (Supabase
 * `.range()` + filtres sur les tables jointes) a envisager quand le
 * catalogue depassera quelques centaines de lignes.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RECETTES_MOCK } from '@/lib/mocks/recettes.mock';
import { fetchRecettesPubliees } from '@/lib/recettesRepository';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { Recette, Regime } from '@/types';

const PAGE_SIZE = 10;

interface FiltresRecettes {
  regime?: Regime[];
  allergies?: string[];
}

/** Normalise pour une comparaison tolerante (accents, casse, espaces) entre l'allergie saisie librement et les allergenes tagues sur les recettes. */
function normaliserAllergie(v: string): string {
  return v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

function filtrerRecettes(source: Recette[], regime: Regime[] | undefined, allergies: string[] | undefined): Recette[] {
  let filtrees = regime?.length ? source.filter((r) => regime.some((reg) => r.regime.includes(reg))) : source;

  if (allergies?.length) {
    const allergiesNormalisees = allergies.map(normaliserAllergie);
    filtrees = filtrees.filter(
      (r) => !r.allergenes.some((a) => allergiesNormalisees.includes(normaliserAllergie(a))),
    );
  }

  return filtrees;
}

export function useRecettes(filtres: FiltresRecettes = {}) {
  const source = useQuery({
    queryKey: ['recettes-publiees'],
    queryFn: () => (isSupabaseConfigured ? fetchRecettesPubliees() : Promise.resolve(RECETTES_MOCK)),
    staleTime: 1000 * 60 * 10,
  });

  const recettesFiltrees = useMemo(
    () => filtrerRecettes(source.data ?? [], filtres.regime, filtres.allergies),
    [source.data, filtres.regime, filtres.allergies],
  );

  // Nombre de pages chargees par combinaison de filtres (pas un simple
  // compteur global) : changer de filtre retombe naturellement sur 1 (cle
  // absente de la map) sans effet ni ref a synchroniser pendant le rendu.
  const filtresKey = `${filtres.regime?.join(',') ?? ''}|${filtres.allergies?.join(',') ?? ''}`;
  const [pagesParFiltre, setPagesParFiltre] = useState<Record<string, number>>({});
  const pagesChargees = pagesParFiltre[filtresKey] ?? 1;

  const pages = useMemo(() => {
    const resultat: Recette[][] = [];
    for (let i = 0; i < pagesChargees; i++) {
      resultat.push(recettesFiltrees.slice(i * PAGE_SIZE, (i + 1) * PAGE_SIZE));
    }
    return resultat;
  }, [recettesFiltrees, pagesChargees]);

  const hasNextPage = pagesChargees * PAGE_SIZE < recettesFiltrees.length;

  return {
    data: { pages },
    isLoading: source.isLoading,
    isError: source.isError,
    error: source.error,
    isEmpty: source.isSuccess && recettesFiltrees.length === 0,
    isRefetching: source.isRefetching,
    refetch: source.refetch,
    fetchNextPage: () =>
      setPagesParFiltre((prev) => ({ ...prev, [filtresKey]: (prev[filtresKey] ?? 1) + 1 })),
    hasNextPage,
  };
}
