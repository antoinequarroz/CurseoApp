/**
 * COUR-20 : lit les prix reels depuis Supabase (schema COUR-16 —
 * enseignes/produits_canoniques/offres_magasin/prix_historique, vue
 * `prix_courant` = derniere observation par offre) pour le comparateur de
 * prix, a la place de lib/mocks/prix.mock.ts.
 *
 * Correspondance produit : le catalogue de produits canoniques est encore
 * petit (une poignee de produits suivis, COUR-16) — recherche tolerante
 * (sous-chaine dans les deux sens) cote client, meme logique que
 * l'ancien `trouverPrixProduit` du mock, pas une recherche plein texte
 * cote serveur qui serait prematuree a ce volume.
 */
import { supabase } from './supabase';
import type { Enseigne } from '@/types';

export interface OffrePrix {
  offreId: string;
  enseigne: Enseigne;
  format: string;
  quantite: number;
  unite: string;
  prix: number;
  prixUnitaire: number;
  promotion: string | null;
  source: string;
  collecteLe: string;
}

export interface ComparatifPrixReel {
  produitCanoniqueId: string;
  nom: string;
  /** Triees par prix_unitaire croissant. */
  offres: OffrePrix[];
  /** null si `offres` est vide (produit reconnu mais aucun prix collecte). */
  meilleurPrixUnitaire: number | null;
}

function normaliser(v: string): string {
  return v.trim().toLowerCase();
}

interface LigneEnseigne {
  id: string;
  code: string;
}

interface LigneOffreBrute {
  offre_id: string;
  enseigne_id: string;
  format: string;
  quantite: number;
  unite: string;
  prix: number;
  prix_unitaire: number;
  promotion: string | null;
  source: string;
  collecte_le: string;
}

/**
 * Comparatif de prix pour un produit designe par son nom libre (ex. un
 * item de liste de courses). `null` si aucun produit canonique ne
 * correspond — distinct d'un produit trouve mais sans offre/prix
 * (`offres: []`), pour que l'UI distingue "je ne connais pas ce produit"
 * de "je connais ce produit mais je n'ai pas encore de prix dessus".
 */
export async function fetchComparatifPrix(nomProduit: string): Promise<ComparatifPrixReel | null> {
  const { data: produits, error: errProduits } = await supabase.from('produits_canoniques').select('id, nom');
  if (errProduits) throw errProduits;

  const cible = normaliser(nomProduit);
  const produit = (produits ?? []).find((p) => {
    const nom = normaliser(p.nom as string);
    return nom.includes(cible) || cible.includes(nom);
  }) as { id: string; nom: string } | undefined;

  if (!produit) return null;

  const { data: offresBrutes, error: errOffres } = await supabase
    .from('prix_courant')
    .select('offre_id, enseigne_id, format, quantite, unite, prix, prix_unitaire, promotion, source, collecte_le')
    .eq('produit_canonique_id', produit.id);
  if (errOffres) throw errOffres;

  const lignes = (offresBrutes ?? []) as unknown as LigneOffreBrute[];
  if (lignes.length === 0) {
    return { produitCanoniqueId: produit.id, nom: produit.nom, offres: [], meilleurPrixUnitaire: null };
  }

  const { data: enseignesBrutes, error: errEnseignes } = await supabase.from('enseignes').select('id, code');
  if (errEnseignes) throw errEnseignes;
  const codeParId = new Map(((enseignesBrutes ?? []) as LigneEnseigne[]).map((e) => [e.id, e.code as Enseigne]));

  const offres: OffrePrix[] = lignes
    .map((o) => ({
      offreId: o.offre_id,
      enseigne: codeParId.get(o.enseigne_id) ?? ('inconnue' as Enseigne),
      format: o.format,
      quantite: o.quantite,
      unite: o.unite,
      prix: o.prix,
      prixUnitaire: o.prix_unitaire,
      promotion: o.promotion,
      source: o.source,
      collecteLe: o.collecte_le,
    }))
    .sort((a, b) => a.prixUnitaire - b.prixUnitaire);

  return {
    produitCanoniqueId: produit.id,
    nom: produit.nom,
    offres,
    meilleurPrixUnitaire: offres[0]!.prixUnitaire,
  };
}
