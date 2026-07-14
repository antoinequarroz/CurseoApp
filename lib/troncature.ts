/**
 * Règles de troncature de texte centralisées (cahier des charges §33).
 * Une seule source de vérité pour numberOfLines/ellipsizeMode au lieu de
 * l'usage ad hoc dans chaque composant.
 */
import type { TextProps } from 'react-native';

type Regle = Pick<TextProps, 'numberOfLines' | 'ellipsizeMode'>;

export const TRONCATURE = {
  /** Titre de recette dans une RecetteCard (liste/accueil). */
  titreRecetteCard: { numberOfLines: 2, ellipsizeMode: 'tail' },
  /** Description de recette dans une RecetteCard. */
  descriptionRecetteCard: { numberOfLines: 3, ellipsizeMode: 'tail' },
  /** Titre de recette affiché dans un slot du planning (JourCard). */
  titreRecettePlanning: { numberOfLines: 1, ellipsizeMode: 'tail' },
  /** Nom de produit dans la liste de courses (ProduitItem). */
  nomProduitCourse: { numberOfLines: 1, ellipsizeMode: 'tail' },
} as const satisfies Record<string, Regle>;
