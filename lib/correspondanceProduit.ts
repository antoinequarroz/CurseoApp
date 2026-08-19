import type { ItemCourse, PreferencesCoursesEnLigne } from '@/types';

export type NiveauCorrespondance = 'forte' | 'moyenne' | 'faible';

const MOTS_VIDES = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'un', 'une', 'avec', 'sans']);

function normaliser(texte: string): string[] {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((mot) => mot.length > 1 && !MOTS_VIDES.has(mot))
    .map((mot) => (mot.length > 4 && mot.endsWith('s') ? mot.slice(0, -1) : mot));
}

export function evaluerCorrespondance(
  demande: string,
  produit: string,
  marque?: string,
): {
  score: number;
  niveau: NiveauCorrespondance;
  validationRequise: boolean;
} {
  const demandes = normaliser(demande);
  const candidats = new Set(normaliser(`${produit} ${marque ?? ''}`));
  const correspondances = demandes.filter((mot) => candidats.has(mot)).length;
  const score = demandes.length === 0 ? 0 : correspondances / demandes.length;
  const niveau: NiveauCorrespondance = score >= 0.75 ? 'forte' : score >= 0.4 ? 'moyenne' : 'faible';
  return { score, niveau, validationRequise: niveau === 'faible' };
}

const FACTEURS: Record<string, { famille: 'masse' | 'volume' | 'piece'; facteur: number }> = {
  g: { famille: 'masse', facteur: 1 },
  kg: { famille: 'masse', facteur: 1000 },
  ml: { famille: 'volume', facteur: 1 },
  cl: { famille: 'volume', facteur: 10 },
  l: { famille: 'volume', facteur: 1000 },
  unite: { famille: 'piece', facteur: 1 },
  unité: { famille: 'piece', facteur: 1 },
  piece: { famille: 'piece', facteur: 1 },
  pièce: { famille: 'piece', facteur: 1 },
};

export function calculerPaquets(
  item: Pick<ItemCourse, 'quantite' | 'unite'>,
  format?: { value: number; unit: string },
): { nombrePaquets: number; formatCompatible: boolean } {
  const besoin = FACTEURS[item.unite.toLowerCase()];
  const paquet = format ? FACTEURS[format.unit.toLowerCase()] : undefined;
  if (!besoin || !paquet || besoin.famille !== paquet.famille || !(format!.value > 0)) {
    return {
      nombrePaquets: besoin?.famille === 'piece' ? Math.max(1, Math.ceil(item.quantite)) : 1,
      formatCompatible: false,
    };
  }
  const quantiteBesoin = item.quantite * besoin.facteur;
  const quantitePaquet = format!.value * paquet.facteur;
  return { nombrePaquets: Math.max(1, Math.ceil(quantiteBesoin / quantitePaquet)), formatCompatible: true };
}

export function classerSelonPreferences<T extends { marque?: string; prix: number }>(
  produits: T[],
  preferences?: PreferencesCoursesEnLigne,
): T[] {
  const normalise = (valeurs: string[]) => valeurs.map((valeur) => valeur.trim().toLowerCase());
  const preferees = normalise(preferences?.marquesPreferees ?? []);
  const refusees = normalise(preferences?.marquesRefusees ?? []);
  return [...produits]
    .filter((produit) => !produit.marque || !refusees.includes(produit.marque.toLowerCase()))
    .sort((a, b) => {
      const aPreferee = a.marque ? preferees.includes(a.marque.toLowerCase()) : false;
      const bPreferee = b.marque ? preferees.includes(b.marque.toLowerCase()) : false;
      if (aPreferee !== bPreferee) return aPreferee ? -1 : 1;
      return a.prix - b.prix;
    });
}
