/**
 * Generation de la liste de courses depuis le planning hebdomadaire.
 * Regles (dans l'ordre d'application) :
 * 1. Normalisation des unites avant fusion (g/kg, ml/l)
 * 2. Fusion des doublons par nom normalise (lowercase, sans accents)
 * 3. Ajustement des quantites selon nb_personnes vs portions de la recette
 * 4. Arrondi TOUJOURS AU-DESSUS a l'unite de vente (340g devient 500g)
 * 5. Soustraction des stocks frigo avant generation
 * 6. Ordre des rayons fixe (voir ORDRE_RAYONS dans types/index.ts)
 */
import { ORDRE_RAYONS, type ItemCourse, type ItemStock, type PlanningHebdomadaire, type Profil, type Rayon } from '@/types';

interface UniteNormalisee {
  valeur: number;
  base: 'g' | 'ml' | 'unite';
}

const UNITES_MASSE_VOLUME: Record<string, { facteur: number; base: 'g' | 'ml' }> = {
  kg: { facteur: 1000, base: 'g' },
  g: { facteur: 1, base: 'g' },
  l: { facteur: 1000, base: 'ml' },
  ml: { facteur: 1, base: 'ml' },
  cl: { facteur: 10, base: 'ml' },
  dl: { facteur: 100, base: 'ml' },
};

function normaliserUnite(quantite: number, unite: string): UniteNormalisee {
  const conversion = UNITES_MASSE_VOLUME[unite.toLowerCase()];
  if (!conversion) return { valeur: quantite, base: 'unite' };
  return { valeur: quantite * conversion.facteur, base: conversion.base };
}

function normaliserNom(nom: string): string {
  return nom
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''); // retire les accents
}

function ajusterPortion(quantite: number, portionsRecette: number, nbPersonnes: number): number {
  if (portionsRecette <= 0) return quantite;
  return (quantite / portionsRecette) * nbPersonnes;
}

/** Arrondit systematiquement vers le haut, a l'unite de vente la plus proche. */
function arrondiVente(valeur: number, base: 'g' | 'ml' | 'unite'): { quantite: number; unite: string } {
  if (base === 'g') {
    if (valeur <= 250) return { quantite: 250, unite: 'g' };
    if (valeur <= 500) return { quantite: 500, unite: 'g' };
    return { quantite: Math.ceil(valeur / 1000), unite: 'kg' };
  }
  if (base === 'ml') {
    if (valeur <= 250) return { quantite: 25, unite: 'cl' };
    if (valeur <= 500) return { quantite: 50, unite: 'cl' };
    return { quantite: Math.ceil(valeur / 1000), unite: 'L' };
  }
  return { quantite: Math.ceil(valeur), unite: 'unite' };
}

const RAYON_PAR_DEFAUT: Rayon = 'Epicerie';

/**
 * Genere la liste de courses consolidee a partir d'un planning hebdomadaire,
 * en ajustant les quantites au foyer et en deduisant les stocks deja en frigo.
 */
export function genererListeCourses(
  planning: PlanningHebdomadaire,
  profil: Pick<Profil, 'nb_personnes'>,
  stocks: ItemStock[] = [],
): ItemCourse[] {
  // Etape 1+2 : accumulation avec normalisation + fusion par nom normalise
  const accumulateur = new Map<
    string,
    { nomAffiche: string; base: 'g' | 'ml' | 'unite'; total: number; rayon: Rayon; recettes: Set<string> }
  >();

  for (const jour of Object.values(planning)) {
    for (const repasPlanifie of [jour.midi, jour.soir]) {
      if (!repasPlanifie) continue;
      const { recette, portions } = repasPlanifie;
      // portions : nombre de personnes pour CE repas (invites), sinon le foyer par defaut.
      const nbPersonnesRepas = portions ?? profil.nb_personnes;

      for (const ingredient of recette.ingredients) {
        const quantiteAjustee = ajusterPortion(ingredient.quantite, recette.portions, nbPersonnesRepas);
        const { valeur, base } = normaliserUnite(quantiteAjustee, ingredient.unite);
        const cle = `${normaliserNom(ingredient.nom)}::${base}`;

        const existant = accumulateur.get(cle);
        if (existant) {
          existant.total += valeur;
          existant.recettes.add(recette.titre);
        } else {
          accumulateur.set(cle, {
            nomAffiche: ingredient.nom,
            base,
            total: valeur,
            rayon: ingredient.rayon ?? RAYON_PAR_DEFAUT,
            recettes: new Set([recette.titre]),
          });
        }
      }
    }
  }

  // Etape 5 : soustraction des stocks deja en frigo
  for (const stock of stocks) {
    const { valeur, base } = normaliserUnite(stock.quantite, stock.unite);
    const cle = `${normaliserNom(stock.produit)}::${base}`;
    const existant = accumulateur.get(cle);
    if (existant) {
      existant.total = Math.max(0, existant.total - valeur);
    }
  }

  // Etape 3+4 : arrondi a l'unite de vente, construction des items finaux
  const items: ItemCourse[] = [];
  let idCounter = 0;
  for (const entry of accumulateur.values()) {
    if (entry.total <= 0) continue; // couvert par le stock frigo
    const { quantite, unite } = arrondiVente(entry.total, entry.base);
    items.push({
      id: `course-${idCounter++}`,
      produit: entry.nomAffiche,
      quantite,
      unite,
      rayon: entry.rayon,
      coche: false,
      recette_origine: Array.from(entry.recettes).join(', '),
    });
  }

  // Etape 6 : tri par ordre de rayon fixe
  return items.sort((a, b) => ORDRE_RAYONS.indexOf(a.rayon) - ORDRE_RAYONS.indexOf(b.rayon));
}
