/**
 * Prix mockes — structures exactement comme une reponse d'API de comparateur
 * de prix pour faciliter la migration vers de vraies APIs enseignes (Phase 3).
 * Aucun scraping : donnees indicatives generees a partir d'un prix de base
 * realiste + une variance par enseigne (Lidl/Aldi generalement moins chers).
 */
import type { Enseigne, ProduitComparatif } from '@/types';

interface ProduitBase {
  nom: string;
  prixBase: number; // Prix de reference (proche Migros/Coop)
  unite: string;
}

const PRODUITS_BASE: ProduitBase[] = [
  { nom: 'Pâtes penne 500g', prixBase: 1.9, unite: 'paquet' },
  { nom: 'Riz basmati 1kg', prixBase: 4.2, unite: 'paquet' },
  { nom: 'Farine blanche 1kg', prixBase: 1.6, unite: 'paquet' },
  { nom: 'Sucre blanc 1kg', prixBase: 1.7, unite: 'paquet' },
  { nom: 'Huile d\'olive 750ml', prixBase: 8.9, unite: 'bouteille' },
  { nom: 'Lait entier 1L', prixBase: 1.75, unite: 'litre' },
  { nom: 'Beurre 250g', prixBase: 3.4, unite: 'paquet' },
  { nom: 'Oeufs x6', prixBase: 3.6, unite: 'boite' },
  { nom: 'Yogourt nature 500g', prixBase: 1.8, unite: 'pot' },
  { nom: 'Gruyère AOP 200g', prixBase: 6.5, unite: 'sachet' },
  { nom: 'Mozzarella 125g', prixBase: 1.9, unite: 'sachet' },
  { nom: 'Blanc de poulet 500g', prixBase: 9.5, unite: 'barquette' },
  { nom: 'Boeuf haché 500g', prixBase: 8.9, unite: 'barquette' },
  { nom: 'Filet de porc 500g', prixBase: 7.9, unite: 'barquette' },
  { nom: 'Saumon frais 300g', prixBase: 11.5, unite: 'barquette' },
  { nom: 'Lardons 200g', prixBase: 4.3, unite: 'sachet' },
  { nom: 'Pommes de terre 2kg', prixBase: 3.9, unite: 'sac' },
  { nom: 'Carottes 1kg', prixBase: 2.4, unite: 'sac' },
  { nom: 'Oignons 1kg', prixBase: 2.2, unite: 'sac' },
  { nom: 'Tomates 500g', prixBase: 3.1, unite: 'barquette' },
  { nom: 'Courgettes 500g', prixBase: 2.8, unite: 'sachet' },
  { nom: 'Poivrons 500g', prixBase: 3.6, unite: 'sachet' },
  { nom: 'Salade batavia', prixBase: 1.6, unite: 'piece' },
  { nom: 'Bananes 1kg', prixBase: 2.5, unite: 'kg' },
  { nom: 'Pommes 1kg', prixBase: 3.2, unite: 'kg' },
  { nom: 'Avocats x2', prixBase: 3.8, unite: 'sachet' },
  { nom: 'Citrons x4', prixBase: 2.6, unite: 'filet' },
  { nom: 'Champignons de Paris 250g', prixBase: 2.3, unite: 'barquette' },
  { nom: 'Ail 1 tête', prixBase: 0.9, unite: 'piece' },
  { nom: 'Poireaux 500g', prixBase: 2.7, unite: 'botte' },
  { nom: 'Pain de campagne 500g', prixBase: 3.3, unite: 'piece' },
  { nom: 'Tortillas x8', prixBase: 3.5, unite: 'paquet' },
  { nom: 'Chapelure 200g', prixBase: 1.5, unite: 'paquet' },
  { nom: 'Tomates pelées 400g', prixBase: 1.4, unite: 'boite' },
  { nom: 'Pois chiches 400g', prixBase: 1.3, unite: 'boite' },
  { nom: 'Lentilles corail 500g', prixBase: 2.9, unite: 'paquet' },
  { nom: 'Lait de coco 400ml', prixBase: 2.1, unite: 'boite' },
  { nom: 'Pâte de curry 200g', prixBase: 3.4, unite: 'pot' },
  { nom: 'Sauce soja 250ml', prixBase: 2.5, unite: 'bouteille' },
  { nom: 'Quinoa 500g', prixBase: 5.9, unite: 'paquet' },
  { nom: 'Feta 200g', prixBase: 3.7, unite: 'sachet' },
  { nom: 'Parmesan râpé 100g', prixBase: 3.2, unite: 'sachet' },
  { nom: 'Crème entière 250ml', prixBase: 1.9, unite: 'briquette' },
  { nom: 'Granola 500g', prixBase: 4.6, unite: 'paquet' },
  { nom: 'Fruits rouges surgelés 500g', prixBase: 4.9, unite: 'sachet' },
  { nom: 'Edamame surgelé 300g', prixBase: 3.6, unite: 'sachet' },
  { nom: 'Bouillon de légumes', prixBase: 2.2, unite: 'cube x8' },
  { nom: 'Vin blanc de cuisine 5dl', prixBase: 6.9, unite: 'bouteille' },
  { nom: 'Vin rouge de cuisine 75cl', prixBase: 8.5, unite: 'bouteille' },
  { nom: 'Chocolat noir 100g', prixBase: 2.4, unite: 'tablette' },
];

/** Variance realiste par enseigne : Lidl/Aldi discount, Migros/Coop reference, promos aleatoires deterministes. */
const VARIANCE_ENSEIGNE: Record<Enseigne, number> = {
  migros: 1.0,
  coop: 1.03,
  lidl: 0.87,
  aldi: 0.85,
  ottos: 0.93,
  manor_food: 1.12,
};

function seedFromString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) % 1000;
  return hash / 1000;
}

function genererPrixProduit(produit: ProduitBase): ProduitComparatif {
  const enseignes: Enseigne[] = ['coop', 'migros', 'lidl', 'aldi'];
  const seed = seedFromString(produit.nom);

  const prix = enseignes.map((enseigne) => {
    const variance = VARIANCE_ENSEIGNE[enseigne];
    const bruit = 1 + (seedFromString(produit.nom + enseigne) - 0.5) * 0.1;
    const prixUnitaire = Math.round(produit.prixBase * variance * bruit * 100) / 100;
    const enPromo = seedFromString(produit.nom + enseigne + 'promo') > 0.85;

    return {
      enseigne,
      prix_unitaire: prixUnitaire,
      promotion: enPromo ? '-20%' : undefined,
      disponible: seed > 0.03, // ~3% de ruptures simulees
    };
  });

  const meilleur = prix.reduce((min, p) => (p.prix_unitaire < min.prix_unitaire ? p : min));

  return { nom: produit.nom, prix, meilleur_prix: meilleur.enseigne };
}

export const PRODUITS_COMPARATIFS: ProduitComparatif[] = PRODUITS_BASE.map(genererPrixProduit);

export function trouverPrixProduit(nom: string): ProduitComparatif | undefined {
  const cible = nom.trim().toLowerCase();
  return PRODUITS_COMPARATIFS.find((p) => p.nom.toLowerCase().includes(cible) || cible.includes(p.nom.toLowerCase()));
}
