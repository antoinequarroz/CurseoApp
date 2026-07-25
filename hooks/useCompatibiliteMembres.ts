/**
 * COUR-25 : filtre une liste de recettes (deja en memoire — typiquement les
 * recettes aimees en attente d'assignation a un repas) pour ne garder que
 * celles compatibles avec TOUS les membres du foyer selectionnes
 * simultanement : intersection des regimes (chaque regime requis par
 * chaque membre doit etre tague sur la recette), union des allergies
 * (exclue si un allergene effectif confirme correspond a N'IMPORTE laquelle
 * des allergies de N'IMPORTE quel membre selectionne). Ce n'est jamais
 * "compatible avec au moins un membre" — une recette incompatible avec un
 * seul membre selectionne doit rester exclue/signalee pour tous.
 *
 * `membresSelectionnes` vide = aucun filtre applique (comportement par
 * defaut : aucun membre selectionne ne restreint rien, cas deja couvert par
 * le filtrage foyer-entier de useRecettes en amont).
 */
import { useMemo } from 'react';
import { useSynonymesAllergenes } from './useSynonymesAllergenes';
import { filtrerParContraintes, type ResultatCompatibilite } from '@/lib/compatibiliteRecette';
import type { MembreFoyer, Recette } from '@/types';

export function useCompatibiliteMembres(recettes: Recette[], membresSelectionnes: MembreFoyer[]): ResultatCompatibilite {
  const synonymes = useSynonymesAllergenes();

  return useMemo(() => {
    if (membresSelectionnes.length === 0) {
      return { recettes, alertesParRecette: {}, allergiesNonReconnues: [] };
    }
    const regimesRequis = Array.from(new Set(membresSelectionnes.flatMap((m) => m.regime)));
    const allergies = Array.from(new Set(membresSelectionnes.flatMap((m) => m.allergies)));
    return filtrerParContraintes(recettes, regimesRequis, allergies, synonymes);
  }, [recettes, membresSelectionnes, synonymes]);
}
