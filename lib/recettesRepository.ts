/**
 * COUR-18 : lit les recettes publiées depuis Supabase (schéma normalisé
 * COUR-14/15) et les reconstruit dans la forme `Recette` attendue par le
 * reste de l'app (ingredients/etapes/regime/allergenes embarqués), pour ne
 * rien changer aux composants d'affichage. `allergenes` reprend les
 * déclarations explicites de l'auteur (`recette_allergenes`) — reste un tag
 * d'affichage simple.
 *
 * COUR-22 : `allergenesEffectifs` complète ça avec les allergènes déclarés
 * ET déduits des ingrédients (vue `recette_allergenes_effectifs`, COUR-15),
 * avec leur `certitude` — c'est ce que `hooks/useRecettes.ts` utilise pour
 * le filtrage/signalement réel, `allergenes` seul étant insuffisant pour ne
 * jamais proposer une recette incompatible comme sûre.
 */
import { supabase } from './supabase';
import type { AllergeneEffectif, Recette, Regime } from '@/types';

interface LigneRecetteBrute {
  id: string;
  titre: string;
  description: string | null;
  image_url: string | null;
  blurhash: string | null;
  temps_preparation: number | null;
  difficulte: string | null;
  cout_estime: number | null;
  calories: number | null;
  portions: number;
  est_communautaire: boolean;
  recette_ingredients: {
    quantite: number;
    unite: string;
    ordre: number;
    ingredients: { nom: string; rayon: string | null } | null;
  }[];
  recette_etapes: { numero: number; instruction: string }[];
  recette_regimes: { regimes: { code: string } | null }[];
  recette_allergenes: { allergenes: { code: string } | null }[];
}

function versRecette(ligne: LigneRecetteBrute, allergenesEffectifs: AllergeneEffectif[]): Recette {
  return {
    id: ligne.id,
    titre: ligne.titre,
    description: ligne.description ?? '',
    image_url: ligne.image_url ?? '',
    blurhash: ligne.blurhash ?? undefined,
    temps_preparation: ligne.temps_preparation ?? 0,
    difficulte: (ligne.difficulte as Recette['difficulte']) ?? 'facile',
    cout_estime: ligne.cout_estime ?? 0,
    calories: ligne.calories ?? 0,
    portions: ligne.portions,
    regime: ligne.recette_regimes.map((r) => r.regimes?.code).filter((c): c is Regime => Boolean(c)),
    allergenes: ligne.recette_allergenes.map((a) => a.allergenes?.code).filter((c): c is string => Boolean(c)),
    allergenesEffectifs,
    ingredients: [...ligne.recette_ingredients]
      .sort((a, b) => a.ordre - b.ordre)
      .map((ri) => ({
        nom: ri.ingredients?.nom ?? '',
        quantite: ri.quantite,
        unite: ri.unite,
        rayon: (ri.ingredients?.rayon as Recette['ingredients'][number]['rayon']) ?? undefined,
      })),
    etapes: [...ligne.recette_etapes].sort((a, b) => a.numero - b.numero).map((e) => e.instruction),
    est_communautaire: ligne.est_communautaire,
  };
}

const SELECT_RECETTE_COMPLETE = `id, titre, description, image_url, blurhash, temps_preparation, difficulte, cout_estime, calories, portions, est_communautaire,
   recette_ingredients ( quantite, unite, ordre, ingredients ( nom, rayon ) ),
   recette_etapes ( numero, instruction ),
   recette_regimes ( regimes ( code ) ),
   recette_allergenes ( allergenes ( code ) )`;

interface LigneAllergeneEffectif {
  recette_id: string;
  code: string;
  libelle: string;
  source: 'declare' | 'deduit';
  certitude: 'confirme' | 'possible';
}

/**
 * Allergènes effectifs (déclarés + déduits, COUR-15) pour un lot de
 * recettes. Requête séparée plutôt qu'un embed PostgREST : la vue
 * `recette_allergenes_effectifs` n'est pas une relation FK que PostgREST
 * sait embarquer automatiquement depuis `recettes`.
 */
async function fetchAllergenesEffectifs(recetteIds: string[]): Promise<Map<string, AllergeneEffectif[]>> {
  const parRecette = new Map<string, AllergeneEffectif[]>();
  if (recetteIds.length === 0) return parRecette;

  const { data, error } = await supabase
    .from('recette_allergenes_effectifs')
    .select('recette_id, code, libelle, source, certitude')
    .in('recette_id', recetteIds);

  if (error) throw error;

  for (const ligne of (data ?? []) as LigneAllergeneEffectif[]) {
    const liste = parRecette.get(ligne.recette_id) ?? [];
    liste.push({ code: ligne.code, libelle: ligne.libelle, source: ligne.source, certitude: ligne.certitude });
    parRecette.set(ligne.recette_id, liste);
  }
  return parRecette;
}

/** Toutes les recettes publiées (statut_publication='publiee'), reconstruites dans la forme app. */
export async function fetchRecettesPubliees(): Promise<Recette[]> {
  const { data, error } = await supabase
    .from('recettes')
    .select(SELECT_RECETTE_COMPLETE)
    .eq('statut_publication', 'publiee')
    .order('created_at', { ascending: false });

  if (error) throw error;
  const lignes = (data ?? []) as unknown as LigneRecetteBrute[];
  const allergenesEffectifs = await fetchAllergenesEffectifs(lignes.map((l) => l.id));
  return lignes.map((ligne) => versRecette(ligne, allergenesEffectifs.get(ligne.id) ?? []));
}

/**
 * Une recette par id (COUR-19) — pour l'ecran de detail
 * (app/recette/[id].tsx), atteignable en deep-link direct sans etre passe
 * par fetchRecettesPubliees avant. `null` si absente ou pas publiee (pas
 * d'erreur : un lien perime/invalide est un cas normal, pas un incident).
 */
export async function fetchRecetteParId(id: string): Promise<Recette | null> {
  const { data, error } = await supabase
    .from('recettes')
    .select(SELECT_RECETTE_COMPLETE)
    .eq('id', id)
    .eq('statut_publication', 'publiee')
    .maybeSingle();

  if (error) {
    // 22P02 = format invalide (id qui n'est pas un uuid, ex. un ancien id
    // de mock communautaire) : traite comme "introuvable", pas une erreur
    // reseau — pas de retry a proposer pour un lien mal forme.
    if (error.code === '22P02') return null;
    throw error;
  }
  if (!data) return null;
  const ligne = data as unknown as LigneRecetteBrute;
  const allergenesEffectifs = await fetchAllergenesEffectifs([ligne.id]);
  return versRecette(ligne, allergenesEffectifs.get(ligne.id) ?? []);
}
