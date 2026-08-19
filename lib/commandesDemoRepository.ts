import { supabase } from '@/lib/supabase';
import type { AdresseLivraison } from '@/types';
import type { BrouillonPanierLive, LivraisonDemo } from '@/stores/panierLiveStore';
import { sousTotalPanier, totalLivraisons, totalProduits } from '@/stores/panierLiveStore';

export interface ConfirmationCommandeDemo {
  id: string;
  reference: string;
  montantTotal: number;
}

export async function enregistrerCommandeDemo(params: {
  profilId: string;
  brouillon: BrouillonPanierLive;
  adresse: AdresseLivraison;
  livraisons: LivraisonDemo[];
}): Promise<ConfirmationCommandeDemo> {
  const reference = `DEMO-${params.brouillon.id.replace(/[^a-zA-Z0-9-]/g, '')}`;
  const montantProduits = totalProduits(params.brouillon);
  const fraisLivraison = totalLivraisons({ ...params.brouillon, livraisons: params.livraisons });
  const montantTotal = Math.round((montantProduits + fraisLivraison) * 100) / 100;
  const paniers = params.brouillon.paniers.map((panier) => ({
    enseigne: panier.enseigne,
    montant: Math.round(sousTotalPanier(panier) * 100) / 100,
    produits: panier.articles,
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
