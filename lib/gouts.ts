/**
 * Categorise une recette pour le swipe "on cerne vos gouts" — derive de son
 * titre/regime plutot que d'ajouter un champ aux mocks/DB (evite une
 * migration pour une simple heuristique d'affichage).
 */
import type { CategorieGout, Recette } from '@/types';

const MOTS_CLES_POISSON = ['saumon', 'thon', 'poisson', 'poke'];
const MOTS_CLES_DESSERT = ['tarte', 'gateau', 'gâteau', 'dessert', 'smoothie'];
const MOTS_CLES_PETIT_DEJEUNER = ['petit-dejeuner', 'petit-déjeuner', 'petit dejeuner'];

export function categoriserRecette(recette: Recette): CategorieGout {
  const titre = recette.titre.toLowerCase();
  if (MOTS_CLES_POISSON.some((mot) => titre.includes(mot))) return 'poisson';
  if (MOTS_CLES_DESSERT.some((mot) => titre.includes(mot))) return 'dessert';
  if (MOTS_CLES_PETIT_DEJEUNER.some((mot) => titre.includes(mot))) return 'petit_dejeuner';
  if (recette.regime.includes('vegetarien') || recette.regime.includes('vegan')) return 'vegetarien';
  return 'viande';
}
