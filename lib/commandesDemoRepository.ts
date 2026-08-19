import { supabase } from '@/lib/supabase';
import type { AdresseLivraison, Enseigne } from '@/types';
import type { BrouillonPanierLive, LivraisonDemo } from '@/stores/panierLiveStore';
import { sousTotalPanier, totalLivraisons, totalProduits } from '@/stores/panierLiveStore';
import type { ResultatCommandeSimulee } from '@/lib/simulateurConnecteurMarchand';
import type { PaiementUniqueDemo } from '@/lib/paiementUniqueDemo';
import { z } from 'zod';

export interface ConfirmationCommandeDemo {
  id: string;
  reference: string;
  montantTotal: number;
}

const LigneLiveSchema = z
  .object({
    id: z.string(),
    produitId: z.string(),
    demande: z.string(),
    produit: z.string(),
    quantite: z.number().positive(),
    prixUnitaire: z.number().nonnegative(),
    marque: z.string().optional(),
    format: z.string().optional(),
    besoinQuantite: z.number().optional(),
    besoinUnite: z.string().optional(),
    nombrePaquets: z.number().optional(),
    pertinence: z.enum(['forte', 'moyenne', 'faible']).optional(),
    validationRequise: z.boolean().optional(),
  })
  .passthrough();

export interface CommandeDemo {
  id: string;
  reference: string | null;
  montantTotal: number;
  strategie: BrouillonPanierLive['strategie'];
  source: string;
  collecteLe: string;
  createdAt: string;
  paniers: {
    enseigne: Enseigne;
    montant: number;
    articles: BrouillonPanierLive['paniers'][number]['articles'];
    referenceSimulation?: string;
  }[];
  livraisons: LivraisonDemo[];
  reprenable: boolean;
}

const SELECT_COMMANDE =
  'id, paiement_reference, montant_total, strategie, source_prix, collecte_le, created_at, paniers, livraisons, nature';

function mapperCommande(ligne: Record<string, unknown>): CommandeDemo | null {
  if (ligne.nature !== 'simulation' || typeof ligne.id !== 'string') return null;
  const paniersBruts = Array.isArray(ligne.paniers) ? ligne.paniers : [];
  const paniers = paniersBruts.flatMap((panier) => {
    if (!panier || typeof panier !== 'object') return [];
    const brut = panier as Record<string, unknown>;
    const enseigne = brut.enseigne as Enseigne;
    const produits = Array.isArray(brut.produits) ? brut.produits : [];
    const articles = produits.flatMap((produit) => {
      const resultat = LigneLiveSchema.safeParse(produit);
      return resultat.success
        ? [resultat.data as BrouillonPanierLive['paniers'][number]['articles'][number]]
        : [];
    });
    return [
      {
        enseigne,
        montant: Number(brut.montant ?? 0),
        articles,
        referenceSimulation:
          typeof brut.reference_simulation === 'string' ? brut.reference_simulation : undefined,
      },
    ];
  });
  return {
    id: ligne.id,
    reference: typeof ligne.paiement_reference === 'string' ? ligne.paiement_reference : null,
    montantTotal: Number(ligne.montant_total ?? 0),
    strategie: (ligne.strategie ?? 'split_cart') as CommandeDemo['strategie'],
    source: typeof ligne.source_prix === 'string' ? ligne.source_prix : 'Estimation',
    collecteLe: typeof ligne.collecte_le === 'string' ? ligne.collecte_le : String(ligne.created_at),
    createdAt: String(ligne.created_at),
    paniers,
    livraisons: Array.isArray(ligne.livraisons) ? (ligne.livraisons as LivraisonDemo[]) : [],
    reprenable: paniers.length > 0 && paniers.every((panier) => panier.articles.length > 0),
  };
}

export async function fetchCommandesDemo(profilId: string): Promise<CommandeDemo[]> {
  const { data, error } = await supabase
    .from('commandes')
    .select(SELECT_COMMANDE)
    .eq('profil_id', profilId)
    .eq('nature', 'simulation')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).flatMap((ligne) => {
    const commande = mapperCommande(ligne as Record<string, unknown>);
    return commande ? [commande] : [];
  });
}

export async function fetchCommandeDemo(commandeId: string, profilId: string): Promise<CommandeDemo | null> {
  const { data, error } = await supabase
    .from('commandes')
    .select(SELECT_COMMANDE)
    .eq('id', commandeId)
    .eq('profil_id', profilId)
    .eq('nature', 'simulation')
    .maybeSingle();
  if (error) throw error;
  return data ? mapperCommande(data as Record<string, unknown>) : null;
}

export async function enregistrerCommandeDemo(params: {
  profilId: string;
  brouillon: BrouillonPanierLive;
  adresse: AdresseLivraison;
  livraisons: LivraisonDemo[];
  confirmations?: ResultatCommandeSimulee[];
  paiement?: PaiementUniqueDemo;
}): Promise<ConfirmationCommandeDemo> {
  const reference =
    params.paiement?.reference ?? `DEMO-${params.brouillon.id.replace(/[^a-zA-Z0-9-]/g, '')}`;
  const montantProduits = totalProduits(params.brouillon);
  const fraisLivraison = totalLivraisons({ ...params.brouillon, livraisons: params.livraisons });
  const montantTotal = Math.round((montantProduits + fraisLivraison) * 100) / 100;
  const paniers = params.brouillon.paniers.map((panier) => ({
    enseigne: panier.enseigne,
    montant: Math.round(sousTotalPanier(panier) * 100) / 100,
    produits: panier.articles,
    reference_simulation: params.confirmations?.find(
      (confirmation) => confirmation.enseigne === panier.enseigne,
    )?.reference,
    transmise: false,
    allocation_paiement: params.paiement?.allocations.find(
      (allocation) => allocation.enseigne === panier.enseigne,
    )?.montant,
  }));

  const payload = {
    profil_id: params.profilId,
    paniers,
    montant_total: montantTotal,
    economies: 0,
    statut: 'simulation_confirmee',
    nature: 'simulation',
    strategie: params.brouillon.strategie,
    adresse_snapshot: {
      libelle: params.adresse.libelle,
      rue: params.adresse.rue,
      npa: params.adresse.npa,
      ville: params.adresse.ville,
      complement: params.adresse.complement,
    },
    livraisons: params.livraisons,
    paiement_reference: reference,
    source_prix: params.brouillon.source,
    collecte_le: params.brouillon.collecteLe,
  };

  const { data, error } = await supabase
    .from('commandes')
    .insert(payload)
    .select('id, paiement_reference, montant_total')
    .maybeSingle();

  if (data) {
    return {
      id: data.id,
      reference: data.paiement_reference ?? reference,
      montantTotal: Number(data.montant_total),
    };
  }

  // L'index d'idempotence est partiel (uniquement quand la référence existe),
  // il ne peut donc pas être ciblé de manière fiable par `upsert(onConflict)`.
  // Seul un doublon attendu déclenche la lecture de la confirmation existante.
  if (!error || error.code !== '23505') throw error;

  // Un deuxième appui retrouve la confirmation existante au lieu de créer un
  // doublon. La requête reste filtrée même si la RLS protège déjà la table.
  const { data: existante, error: lectureErreur } = await supabase
    .from('commandes')
    .select('id, paiement_reference, montant_total')
    .eq('profil_id', params.profilId)
    .eq('paiement_reference', reference)
    .single();
  if (lectureErreur) throw lectureErreur;
  return {
    id: existante.id,
    reference: existante.paiement_reference ?? reference,
    montantTotal: Number(existante.montant_total),
  };
}
