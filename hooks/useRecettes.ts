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
 *
 * COUR-25 : le filtrage regime/allergies (contraintes du profil foyer
 * entier) est factorise dans lib/compatibiliteRecette.ts, partage avec
 * useCompatibiliteMembres.ts (contraintes de membres precis pour un repas).
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RECETTES_MOCK } from '@/lib/mocks/recettes.mock';
import { fetchRecettesPubliees } from '@/lib/recettesRepository';
import { filtrerParContraintes, type AlerteAllergene } from '@/lib/compatibiliteRecette';
import { estCompatibleAvecCuisine, equipementsManquants } from '@/lib/equipementsCuisine';
import { useSynonymesAllergenes } from './useSynonymesAllergenes';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { EquipementCuisine, Recette, Regime } from '@/types';

export type { AlerteAllergene };

const PAGE_SIZE = 10;
const AUCUNE_RECETTE: Recette[] = [];

interface FiltresRecettes {
  regime?: Regime[];
  allergies?: string[];
  equipementsCuisine?: EquipementCuisine[] | null;
  uniquementCompatibles?: boolean;
}

export function useRecettes(filtres: FiltresRecettes = {}) {
  const source = useQuery({
    queryKey: ['recettes-publiees'],
    queryFn: () => (isSupabaseConfigured ? fetchRecettesPubliees() : Promise.resolve(RECETTES_MOCK)),
    staleTime: 1000 * 60 * 10,
  });

  const synonymes = useSynonymesAllergenes();
  const catalogue = source.data ?? AUCUNE_RECETTE;

  const { recettes: recettesFiltrees, alertesParRecette, allergiesNonReconnues } = useMemo(
    () => filtrerParContraintes(catalogue, filtres.regime ?? [], filtres.allergies ?? [], synonymes),
    [catalogue, filtres.regime, filtres.allergies, synonymes],
  );

  // L'équipement n'est pas une contrainte de sécurité : par défaut les
  // recettes réalisables passent devant, mais les autres restent visibles
  // avec un avertissement. Le filtre strict est un choix explicite.
  const recettesAffichees = useMemo(() => {
    if (filtres.equipementsCuisine == null) return recettesFiltrees;
    const compatibles = recettesFiltrees.filter((recette) =>
      estCompatibleAvecCuisine(recette, filtres.equipementsCuisine),
    );
    if (filtres.uniquementCompatibles) return compatibles;
    const autres = recettesFiltrees.filter((recette) =>
      !estCompatibleAvecCuisine(recette, filtres.equipementsCuisine),
    );
    return [...compatibles, ...autres];
  }, [recettesFiltrees, filtres.equipementsCuisine, filtres.uniquementCompatibles]);

  const equipementsManquantsParRecette = useMemo(
    () => Object.fromEntries(
      recettesFiltrees.map((recette) => [
        recette.id,
        equipementsManquants(recette, filtres.equipementsCuisine),
      ]),
    ) as Record<string, EquipementCuisine[]>,
    [recettesFiltrees, filtres.equipementsCuisine],
  );

  // Nombre de pages chargees par combinaison de filtres (pas un simple
  // compteur global) : changer de filtre retombe naturellement sur 1 (cle
  // absente de la map) sans effet ni ref a synchroniser pendant le rendu.
  const filtresKey = `${filtres.regime?.join(',') ?? ''}|${filtres.allergies?.join(',') ?? ''}|${
    filtres.equipementsCuisine?.join(',') ?? 'non-renseigne'
  }|${filtres.uniquementCompatibles ? 'strict' : 'souple'}`;
  const [pagesParFiltre, setPagesParFiltre] = useState<Record<string, number>>({});
  const pagesChargees = pagesParFiltre[filtresKey] ?? 1;

  const pages = useMemo(() => {
    const resultat: Recette[][] = [];
    for (let i = 0; i < pagesChargees; i++) {
      resultat.push(recettesAffichees.slice(i * PAGE_SIZE, (i + 1) * PAGE_SIZE));
    }
    return resultat;
  }, [recettesAffichees, pagesChargees]);

  const hasNextPage = pagesChargees * PAGE_SIZE < recettesAffichees.length;

  return {
    data: { pages },
    isLoading: source.isLoading,
    isError: source.isError,
    error: source.error,
    // Ne pas confondre une table réellement vide avec un catalogue qui ne
    // contient aucune recette compatible avec les contraintes du foyer.
    isCatalogueEmpty: source.isSuccess && catalogue.length === 0,
    isFilteredEmpty: source.isSuccess && catalogue.length > 0 && recettesFiltrees.length === 0,
    isEquipmentFilteredEmpty:
      source.isSuccess && recettesFiltrees.length > 0 && recettesAffichees.length === 0,
    isEmpty: source.isSuccess && recettesAffichees.length === 0,
    isRefetching: source.isRefetching,
    isPaused: source.fetchStatus === 'paused',
    // `data !== undefined` distingue un résultat déjà chargé (même vide)
    // d'un premier lancement hors ligne sans aucune donnée disponible.
    hasCachedData: source.data !== undefined,
    refetch: source.refetch,
    fetchNextPage: () =>
      setPagesParFiltre((prev) => ({ ...prev, [filtresKey]: (prev[filtresKey] ?? 1) + 1 })),
    hasNextPage,
    // Le planning doit pouvoir reconstruire les favoris persistants meme si
    // leur carte n'appartient pas encore a une page visible du carrousel.
    toutesRecettes: recettesFiltrees,
    equipementsManquantsParRecette,
    // COUR-22 : par recette.id, allergenes de l'utilisateur matches en
    // 'possible' seulement — jamais utilise pour exclure, seulement pour
    // afficher un avertissement explicite (ne jamais presenter comme sur).
    alertesParRecette,
    // COUR-22 : allergies saisies par l'utilisateur qu'aucun synonyme connu
    // ne resout — a afficher explicitement, ces recettes ne sont PAS
    // filtrees pour ces allergies-la (donnee absente du referentiel).
    allergiesNonReconnues,
  };
}
