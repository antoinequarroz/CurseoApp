/**
 * COUR-76 — frontières stables entre l'app et les futures API officielles.
 * Une capacité absente reste `false`; aucun adaptateur ne doit la simuler en
 * production ni déduire qu'une recherche catalogue autorise une commande.
 */
import type { AdresseLivraison, Enseigne } from '@/types';

export interface CapacitesConnecteurEnseigne {
  mode: 'catalogue' | 'simulation' | 'marchand';
  catalogue: boolean;
  disponibilite: boolean;
  panier: boolean;
  livraison: boolean;
  commande: boolean;
  paiement: boolean;
  transmissionCommande: boolean;
}

export interface ProduitConnecteur {
  id: string;
  enseigne: Enseigne;
  nom: string;
  prix: number;
  format?: string;
  url?: string;
}

export interface CatalogueEnseigne {
  capacites: CapacitesConnecteurEnseigne;
  rechercherProduits(requete: string, npa: string): Promise<ProduitConnecteur[]>;
}

export interface PanierEnseigneConnecteur {
  creerPanier(): Promise<string>;
  definirQuantite(panierId: string, produitId: string, quantite: number): Promise<void>;
}

export interface CommandeEnseigneConnecteur {
  obtenirLivraisons(
    adresse: AdresseLivraison,
  ): Promise<readonly { id: string; libelle: string; prix: number }[]>;
  creerCommande(panierId: string, livraisonId: string): Promise<{ reference: string }>;
}

export const CAPACITES_SWISSGROCERIES: CapacitesConnecteurEnseigne = {
  mode: 'catalogue',
  catalogue: true,
  disponibilite: true,
  panier: false,
  livraison: false,
  commande: false,
  paiement: false,
  transmissionCommande: false,
};

export const CAPACITES_SIMULATEUR_CHECKOUT: CapacitesConnecteurEnseigne = {
  mode: 'simulation',
  catalogue: false,
  disponibilite: false,
  panier: true,
  livraison: true,
  commande: true,
  paiement: false,
  transmissionCommande: false,
};
