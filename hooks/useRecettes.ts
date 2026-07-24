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
import { fetchSynonymesAllergenes, type SynonymeAllergene } from '@/lib/allergenesRepository';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { AllergeneEffectif, Recette, Regime } from '@/types';

const PAGE_SIZE = 10;

interface FiltresRecettes {
  regime?: Regime[];
  allergies?: string[];
}

/** Un allergene resolu de l'utilisateur qui match une recette en 'possible' seulement (COUR-22) : jamais exclue, toujours signalee. */
export interface AlerteAllergene {
  code: string;
  libelle: string;
}

/** Normalise pour une comparaison tolerante (accents, casse, espaces) entre l'allergie saisie librement et le referentiel/les allergenes tagues sur les recettes. */
function normaliserAllergie(v: string): string {
  return v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Resout une allergie saisie librement vers un code canonique via le
 * referentiel de synonymes (COUR-15). `synonymes === null` = mode degrade
 * sans Supabase (RECETTES_MOCK) : pas de referentiel disponible, on retombe
 * sur l'ancienne comparaison exacte plutot que de tout marquer "non reconnu".
 * Repli pluriel simple (retrait du 's' final) pour les variantes non
 * explicitement seedees dans synonymes_allergenes.
 */
function resoudreAllergie(terme: string, synonymes: Map<string, string> | null): string | null {
  const normalise = normaliserAllergie(terme);
  if (synonymes === null) return normalise;
  if (synonymes.has(normalise)) return synonymes.get(normalise) ?? null;
  if (normalise.endsWith('s')) {
    const singulier = normalise.slice(0, -1);
    if (synonymes.has(singulier)) return synonymes.get(singulier) ?? null;
  }
  return null;
}

/** Allergenes effectifs d'une recette, avec repli sur `allergenes` (declares uniquement) pour le catalogue mock qui n'a pas `allergenesEffectifs`. */
function allergenesEffectifsDe(r: Recette): AllergeneEffectif[] {
  return r.allergenesEffectifs ?? r.allergenes.map((code) => ({ code, libelle: code, source: 'declare' as const, certitude: 'confirme' as const }));
}

interface ResultatFiltrage {
  recettes: Recette[];
  alertesParRecette: Record<string, AlerteAllergene[]>;
  allergiesNonReconnues: string[];
}

/**
 * COUR-22 : une recette n'est JAMAIS proposee comme sure si un allergene
 * resolu de l'utilisateur y est effectif avec `certitude='confirme'`
 * (declare par l'auteur ou deduit de facon certaine d'un ingredient) — elle
 * est exclue du resultat. Un match `certitude='possible'` (deduction
 * ambigue, ex. trace/contamination croisee) n'exclut PAS la recette mais la
 * signale explicitement via `alertesParRecette` : jamais silencieux, jamais
 * traite comme sur non plus. Une allergie saisie que le referentiel ne
 * reconnait pas est remontee separement (`allergiesNonReconnues`) plutot que
 * silencieusement ignoree.
 */
function filtrerEtSignalerRecettes(
  source: Recette[],
  regime: Regime[] | undefined,
  allergies: string[] | undefined,
  synonymes: Map<string, string> | null,
): ResultatFiltrage {
  const filtreesParRegime = regime?.length ? source.filter((r) => regime.some((reg) => r.regime.includes(reg))) : source;

  if (!allergies?.length) {
    return { recettes: filtreesParRegime, alertesParRecette: {}, allergiesNonReconnues: [] };
  }

  const codesResolus: string[] = [];
  const allergiesNonReconnues: string[] = [];
  for (const terme of allergies) {
    const code = resoudreAllergie(terme, synonymes);
    if (code) codesResolus.push(code);
    else allergiesNonReconnues.push(terme);
  }

  const alertesParRecette: Record<string, AlerteAllergene[]> = {};
  const recettes = filtreesParRegime.filter((r) => {
    const effectifs = allergenesEffectifsDe(r);
    const confirmes = effectifs.some((e) => e.certitude === 'confirme' && codesResolus.includes(e.code));
    if (confirmes) return false;

    const possibles = effectifs.filter((e) => e.certitude === 'possible' && codesResolus.includes(e.code));
    if (possibles.length > 0) {
      alertesParRecette[r.id] = possibles.map((e) => ({ code: e.code, libelle: e.libelle }));
    }
    return true;
  });

  return { recettes, alertesParRecette, allergiesNonReconnues };
}

export function useRecettes(filtres: FiltresRecettes = {}) {
  const source = useQuery({
    queryKey: ['recettes-publiees'],
    queryFn: () => (isSupabaseConfigured ? fetchRecettesPubliees() : Promise.resolve(RECETTES_MOCK)),
    staleTime: 1000 * 60 * 10,
  });

  // Referentiel de synonymes (COUR-15/22) : figé pour la session, un seul
  // fetch (staleTime infini) plutot qu'un appel RPC par allergie du profil.
  const synonymesQuery = useQuery({
    queryKey: ['synonymes-allergenes'],
    queryFn: (): Promise<SynonymeAllergene[]> => (isSupabaseConfigured ? fetchSynonymesAllergenes() : Promise.resolve([])),
    staleTime: Infinity,
  });

  const synonymes = useMemo(() => {
    if (!isSupabaseConfigured) return null;
    const map = new Map<string, string>();
    for (const s of synonymesQuery.data ?? []) map.set(normaliserAllergie(s.terme), s.code);
    return map;
  }, [synonymesQuery.data]);

  const { recettes: recettesFiltrees, alertesParRecette, allergiesNonReconnues } = useMemo(
    () => filtrerEtSignalerRecettes(source.data ?? [], filtres.regime, filtres.allergies, synonymes),
    [source.data, filtres.regime, filtres.allergies, synonymes],
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
