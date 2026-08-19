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
  base: string;
  uniteAffichee: string;
}

const UNITES_MASSE_VOLUME: Record<string, { facteur: number; base: 'g' | 'ml' }> = {
  kg: { facteur: 1000, base: 'g' },
  g: { facteur: 1, base: 'g' },
  l: { facteur: 1000, base: 'ml' },
  ml: { facteur: 1, base: 'ml' },
  cl: { facteur: 10, base: 'ml' },
  dl: { facteur: 100, base: 'ml' },
  cs: { facteur: 15, base: 'ml' },
  'c. a soupe': { facteur: 15, base: 'ml' },
  'c. à soupe': { facteur: 15, base: 'ml' },
  cc: { facteur: 5, base: 'ml' },
  'c. a cafe': { facteur: 5, base: 'ml' },
  'c. à café': { facteur: 5, base: 'ml' },
};

const UNITES_PIECE = new Set(['unite', 'unité', 'unites', 'unités', 'piece', 'pièce', 'pieces', 'pièces']);

const ALIASES_INGREDIENTS: Record<string, string> = {
  'oeufs': 'oeuf',
  'œufs': 'oeuf',
  'pommes de terre': 'pomme de terre',
  'paves de saumon': 'pave de saumon',
  'pavés de saumon': 'pave de saumon',
};

function normaliserUnite(quantite: number, unite: string): UniteNormalisee {
  const cle = normaliserNom(unite).replace(/\s+/g, ' ');
  const conversion = UNITES_MASSE_VOLUME[cle];
  if (conversion) {
    return { valeur: quantite * conversion.facteur, base: conversion.base, uniteAffichee: conversion.base };
  }
  if (UNITES_PIECE.has(cle)) return { valeur: quantite, base: 'unite', uniteAffichee: 'unite' };

  // Une botte, une tranche ou une boîte ne sont pas interchangeables avec une
  // « unité ». Leur libellé fait donc partie de la clé de fusion.
  return { valeur: quantite, base: `conditionnement:${cle}`, uniteAffichee: unite.trim() || 'unite' };
}

function normaliserNom(nom: string): string {
  const normalise = nom
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''); // retire les accents
  return ALIASES_INGREDIENTS[normalise] ?? normalise;
}

function ajusterPortion(quantite: number, portionsRecette: number, nbPersonnes: number): number {
  if (portionsRecette <= 0) return quantite;
  return (quantite / portionsRecette) * nbPersonnes;
}

/** Arrondit systematiquement vers le haut, a l'unite de vente la plus proche. */
function arrondiVente(valeur: number, base: string, uniteAffichee: string): { quantite: number; unite: string } {
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
  return { quantite: Math.ceil(valeur), unite: uniteAffichee };
}

/** Clé stable utilisée pour conserver l'état coché lors d'une régénération. */
export function cleItemCourse(item: Pick<ItemCourse, 'produit' | 'unite'>): string {
  const unite = normaliserNom(item.unite);
  const familleUnite = ['g', 'kg'].includes(unite)
    ? 'masse'
    : ['ml', 'cl', 'dl', 'l'].includes(unite)
      ? 'volume'
      : unite;
  return `${normaliserNom(item.produit)}::${familleUnite}`;
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
    { nomAffiche: string; base: string; uniteAffichee: string; total: number; rayon: Rayon; recettes: Set<string> }
  >();

  for (const jour of Object.values(planning)) {
    for (const repasPlanifie of [jour.midi, jour.soir]) {
      if (!repasPlanifie) continue;
      const { recette, portions } = repasPlanifie;
      // portions : nombre de personnes pour CE repas (invites), sinon le foyer par defaut.
      const nbPersonnesRepas = portions ?? profil.nb_personnes;

      for (const ingredient of recette.ingredients) {
        const quantiteAjustee = ajusterPortion(ingredient.quantite, recette.portions, nbPersonnesRepas);
        const { valeur, base, uniteAffichee } = normaliserUnite(quantiteAjustee, ingredient.unite);
        const cle = `${normaliserNom(ingredient.nom)}::${base}`;

        const existant = accumulateur.get(cle);
        if (existant) {
          existant.total += valeur;
          existant.recettes.add(recette.titre);
        } else {
          accumulateur.set(cle, {
            nomAffiche: ingredient.nom,
            base,
            uniteAffichee,
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
  for (const entry of accumulateur.values()) {
    if (entry.total <= 0) continue; // couvert par le stock frigo
    const { quantite, unite } = arrondiVente(entry.total, entry.base, entry.uniteAffichee);
    const cleStable = `${normaliserNom(entry.nomAffiche)}::${normaliserNom(unite)}`;
    items.push({
      id: `course-${encodeURIComponent(cleStable)}`,
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
