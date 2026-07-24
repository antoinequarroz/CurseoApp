/**
 * COUR-18 : lit les recettes publiées depuis Supabase (schéma normalisé
 * COUR-14/15) et les reconstruit dans la forme `Recette` attendue par le
 * reste de l'app (ingredients/etapes/regime/allergenes embarqués), pour ne
 * rien changer aux composants d'affichage. `allergenes` reprend les
 * déclarations explicites de l'auteur (`recette_allergenes`), pas les
 * allergènes déduits des ingrédients (`recette_allergenes_effectifs`,
 * COUR-15) — ce dernier mélange volontairement du "possible", pas adapté à
 * un simple tag d'affichage/filtrage.
 */
import { supabase } from './supabase';
import type { Recette, Regime } from '@/types';

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

function versRecette(ligne: LigneRecetteBrute): Recette {
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

/** Toutes les recettes publiées (statut_publication='publiee'), reconstruites dans la forme app. */
export async function fetchRecettesPubliees(): Promise<Recette[]> {
  const { data, error } = await supabase
    .from('recettes')
    .select(SELECT_RECETTE_COMPLETE)
    .eq('statut_publication', 'publiee')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as LigneRecetteBrute[]).map(versRecette);
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
  return data ? versRecette(data as unknown as LigneRecetteBrute) : null;
}
