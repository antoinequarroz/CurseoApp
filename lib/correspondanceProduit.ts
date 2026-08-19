import type { ItemCourse, PreferencesCoursesEnLigne } from '@/types';

export type NiveauCorrespondance = 'forte' | 'moyenne' | 'faible';

const MOTS_VIDES = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'un', 'une', 'avec', 'sans']);
const SYNONYMES = new Map<string, string>([
  ['zucchini', 'courgette'],
  ['courgettes', 'courgette'],
  ['aubergines', 'aubergine'],
  ['tomates', 'tomate'],
  ['pommes', 'pomme'],
  ['bananes', 'banane'],
  ['oeufs', 'oeuf'],
  ['œufs', 'oeuf'],
  ['yogourt', 'yaourt'],
  ['yogourts', 'yaourt'],
  ['yaourts', 'yaourt'],
  ['spaghettis', 'spaghetti'],
  ['pois-chiches', 'pois_chiche'],
  ['pois-chiche', 'pois_chiche'],
  ['chickpeas', 'pois_chiche'],
]);
const QUALIFICATIFS_EXCLUSIFS = [
  ['entier', 'ecreme'],
  ['entier', 'demi-ecreme'],
  ['sale', 'doux'],
] as const;

export function normaliserProduit(texte: string): string[] {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/[^a-z0-9-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((mot) => mot.length > 1 && !MOTS_VIDES.has(mot))
    .map((mot) => SYNONYMES.get(mot) ?? (mot.length > 4 && mot.endsWith('s') ? mot.slice(0, -1) : mot));
}

export function evaluerCorrespondance(
  demande: string,
  produit: string,
  marque?: string,
): {
  score: number;
  niveau: NiveauCorrespondance;
  validationRequise: boolean;
  raisons: ('nom' | 'partiel' | 'variante_a_verifier')[];
} {
  const demandes = normaliserProduit(demande);
  const candidatsListe = normaliserProduit(`${produit} ${marque ?? ''}`);
  const candidats = new Set(candidatsListe);
  const correspondances = demandes.filter((mot) => candidats.has(mot)).length;
  const conflit = QUALIFICATIFS_EXCLUSIFS.some(
    ([a, b]) => (demandes.includes(a) && candidats.has(b)) || (demandes.includes(b) && candidats.has(a)),
  );
  const couverture = demandes.length === 0 ? 0 : correspondances / demandes.length;
  const precision = candidatsListe.length === 0 ? 0 : correspondances / candidatsListe.length;
  const score = Math.max(0, Math.min(1, couverture * 0.8 + precision * 0.2 - (conflit ? 0.45 : 0)));
  const niveau: NiveauCorrespondance = score >= 0.75 ? 'forte' : score >= 0.4 ? 'moyenne' : 'faible';
  const raisons: ('nom' | 'partiel' | 'variante_a_verifier')[] = [];
  if (couverture === 1 && !conflit) raisons.push('nom');
  else if (correspondances > 0) raisons.push('partiel');
  if (conflit) raisons.push('variante_a_verifier');
  return { score, niveau, validationRequise: niveau === 'faible' || conflit, raisons };
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

export interface ComparaisonSubstitution {
  nombrePaquets: number;
  formatCompatible: boolean;
  ancienMontant: number;
  nouveauMontant: number;
  ecartMontant: number;
  changeEnseigne: boolean;
}

export function comparerSubstitution(
  ligne: {
    quantite: number;
    prixUnitaire: number;
    besoinQuantite?: number;
    besoinUnite?: string;
    enseigne?: string;
  },
  produit: { prix: number; taille?: { value: number; unit: string }; enseigne: string },
): ComparaisonSubstitution {
  const paquets = calculerPaquets(
    {
      quantite: ligne.besoinQuantite ?? ligne.quantite,
      unite: ligne.besoinUnite ?? 'piece',
    },
    produit.taille,
  );
  const ancienMontant = Math.round(ligne.prixUnitaire * ligne.quantite * 100) / 100;
  const nouveauMontant = Math.round(produit.prix * paquets.nombrePaquets * 100) / 100;
  return {
    ...paquets,
    ancienMontant,
    nouveauMontant,
    ecartMontant: Math.round((nouveauMontant - ancienMontant) * 100) / 100,
    changeEnseigne: Boolean(ligne.enseigne && ligne.enseigne !== produit.enseigne),
  };
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
