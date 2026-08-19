import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  OptionOptimisationCoursesLive,
  OptimisationCoursesLive,
  StrategieCoursesLive,
  ProduitRechercheLive,
} from '@/lib/swissGroceriesRepository';
import type { Enseigne } from '@/types';
import type { NiveauCorrespondance } from '@/lib/correspondanceProduit';
import { calculerPaquets } from '@/lib/correspondanceProduit';
import type { CommandeDemo } from '@/lib/commandesDemoRepository';
import type { ResultatLigneRafraichie } from '@/lib/rafraichissementPanier';

export interface LignePanierLive {
  id: string;
  produitId: string;
  demande: string;
  produit: string;
  marque?: string;
  format?: string;
  taillePaquet?: { value: number; unit: string };
  quantite: number;
  prixUnitaire: number;
  urlProduit?: string;
  besoinQuantite?: number;
  besoinUnite?: string;
  nombrePaquets?: number;
  formatCompatible?: boolean;
  pertinence?: NiveauCorrespondance;
  validationRequise?: boolean;
  validationUtilisateur?: boolean;
  selectionAutomatique?: boolean;
  raisonsCorrespondance?: ('nom' | 'partiel' | 'variante_a_verifier')[];
  remplacementDe?: { produit: string; montant: number };
  disponibilite?: 'resultat_catalogue' | 'non_confirmee';
  derniereVerificationLe?: string;
}

export interface PanierLive {
  enseigne: Enseigne;
  magasin?: string;
  articles: LignePanierLive[];
}

export interface LivraisonDemo {
  enseigne: Enseigne;
  id: string;
  libelle: string;
  prix: number;
  creneau?: CreneauLivraisonDemo;
}

export interface CreneauLivraisonDemo {
  id: string;
  debut: string;
  fin: string;
  periode: 'matin' | 'apres_midi' | 'soir';
}

export interface BrouillonPanierLive {
  id: string;
  npa: string;
  strategie: StrategieCoursesLive;
  paniers: PanierLive[];
  articlesNonTrouves: string[];
  source: 'SwissGroceries';
  collecteLe: string;
  adresseId: string | null;
  livraisons: LivraisonDemo[];
  paiementEnCours: boolean;
  creeLe: string;
}

function versPaniers(option: OptionOptimisationCoursesLive): PanierLive[] {
  return option.arrets.map((arret) => ({
    enseigne: arret.enseigne,
    magasin: arret.magasin,
    articles: arret.articles.map((article, index) => ({
      id: `${arret.enseigne}:${article.produitId}:${index}`,
      produitId: article.produitId,
      demande: article.demande,
      produit: article.produit,
      marque: article.marque,
      format: article.format,
      taillePaquet: article.taillePaquet,
      quantite: article.quantite,
      prixUnitaire: article.prixUnitaire,
      urlProduit: article.urlProduit,
      besoinQuantite: article.besoinQuantite,
      besoinUnite: article.besoinUnite,
      nombrePaquets: article.nombrePaquets,
      formatCompatible: article.formatCompatible,
      pertinence: article.pertinence,
      validationRequise: article.validationRequise,
      // COUR-91 : la reference vient du catalogue de l'enseigne et est choisie
      // automatiquement. L'utilisateur valide le panier global, pas chaque SKU.
      validationUtilisateur: true,
      selectionAutomatique: article.selectionAutomatique,
      raisonsCorrespondance: article.raisonsCorrespondance,
      disponibilite: article.disponibilite,
    })),
  }));
}

export function sousTotalPanier(panier: PanierLive): number {
  return panier.articles.reduce((total, article) => total + article.prixUnitaire * article.quantite, 0);
}

export function totalProduits(brouillon: BrouillonPanierLive): number {
  return brouillon.paniers.reduce((total, panier) => total + sousTotalPanier(panier), 0);
}

export function totalLivraisons(brouillon: BrouillonPanierLive): number {
  return brouillon.livraisons.reduce((total, livraison) => total + livraison.prix, 0);
}

export function trouverLignePanier(
  brouillon: BrouillonPanierLive | null,
  ligneId: string | undefined,
): { ligne: LignePanierLive; enseigne: Enseigne } | null {
  if (!brouillon || !ligneId) return null;
  for (const panier of brouillon.paniers) {
    const ligne = panier.articles.find((article) => article.id === ligneId);
    if (ligne) return { ligne, enseigne: panier.enseigne };
  }
  return null;
}

interface PanierLiveState {
  brouillon: BrouillonPanierLive | null;
  creerDepuisOptimisation: (
    resultat: OptimisationCoursesLive,
    option: OptionOptimisationCoursesLive,
    npa: string,
  ) => void;
  definirQuantite: (ligneId: string, quantite: number) => void;
  retirerArticle: (ligneId: string) => void;
  remplacerArticle: (ligneId: string, produit: ProduitRechercheLive) => void;
  validerCorrespondance: (ligneId: string) => void;
  appliquerRafraichissement: (
    resultats: ResultatLigneRafraichie[],
    collecteLe: string,
  ) => void;
  reprendreDepuisCommande: (commande: CommandeDemo) => void;
  definirAdresse: (adresseId: string) => void;
  definirLivraisons: (livraisons: LivraisonDemo[]) => void;
  definirPaiementEnCours: (enCours: boolean) => void;
  reset: () => void;
}

export const usePanierLiveStore = create<PanierLiveState>()(
  persist(
    (set) => ({
      brouillon: null,
      creerDepuisOptimisation: (resultat, option, npa) =>
        set({
          brouillon: {
            id: `brouillon-${Date.now()}`,
            npa,
            strategie: option.strategie,
            paniers: versPaniers(option),
            articlesNonTrouves: option.articlesNonTrouves,
            source: resultat.source,
            collecteLe: resultat.collecteLe,
            adresseId: null,
            livraisons: [],
            paiementEnCours: false,
            creeLe: new Date().toISOString(),
          },
        }),
      definirQuantite: (ligneId, quantite) =>
        set((state) => {
          if (!state.brouillon) return state;
          return {
            brouillon: {
              ...state.brouillon,
              paniers: state.brouillon.paniers.map((panier) => ({
                ...panier,
                articles: panier.articles.map((article) =>
                  article.id === ligneId
                    ? { ...article, quantite: Math.max(1, Math.min(99, quantite)) }
                    : article,
                ),
              })),
            },
          };
        }),
      retirerArticle: (ligneId) =>
        set((state) => {
          if (!state.brouillon) return state;
          return {
            brouillon: {
              ...state.brouillon,
              paniers: state.brouillon.paniers
                .map((panier) => ({
                  ...panier,
                  articles: panier.articles.filter((article) => article.id !== ligneId),
                }))
                .filter((panier) => panier.articles.length > 0),
            },
          };
        }),
      remplacerArticle: (ligneId, produit) =>
        set((state) => {
          if (!state.brouillon) return state;
          let ligneSource: LignePanierLive | undefined;
          const sansSource = state.brouillon.paniers
            .map((panier) => ({
              ...panier,
              articles: panier.articles.filter((article) => {
                if (article.id === ligneId) ligneSource = article;
                return article.id !== ligneId;
              }),
            }))
            .filter((panier) => panier.articles.length > 0);
          if (!ligneSource) return state;
          const paquets = calculerPaquets(
            {
              quantite: ligneSource.besoinQuantite ?? ligneSource.quantite,
              unite: ligneSource.besoinUnite ?? 'piece',
            },
            produit.taille,
          );
          const remplacee: LignePanierLive = {
            ...ligneSource,
            id: `${produit.enseigne}:${produit.id}:${Date.now()}`,
            produitId: produit.id,
            produit: produit.nom,
            marque: produit.marque,
            format: produit.format,
            taillePaquet: produit.taille,
            prixUnitaire: produit.prix,
            quantite: paquets.nombrePaquets,
            urlProduit: undefined,
            pertinence: produit.pertinence,
            validationRequise: produit.validationRequise,
            // Le remplacement est appliqué uniquement après le bouton de confirmation
            // dédié : cette action vaut validation explicite de la correspondance choisie.
            validationUtilisateur: true,
            raisonsCorrespondance: produit.raisonsCorrespondance,
            remplacementDe: {
              produit: ligneSource.produit,
              montant: Math.round(ligneSource.prixUnitaire * ligneSource.quantite * 100) / 100,
            },
            disponibilite: 'resultat_catalogue',
            nombrePaquets: paquets.nombrePaquets,
            formatCompatible: paquets.formatCompatible,
            derniereVerificationLe: new Date().toISOString(),
          };
          const cible = sansSource.find((panier) => panier.enseigne === produit.enseigne);
          const paniers = cible
            ? sansSource.map((panier) =>
                panier.enseigne === produit.enseigne
                  ? { ...panier, articles: [...panier.articles, remplacee] }
                  : panier,
              )
            : [...sansSource, { enseigne: produit.enseigne, articles: [remplacee] }];
          return { brouillon: { ...state.brouillon, paniers, livraisons: [] } };
        }),
      validerCorrespondance: (ligneId) =>
        set((state) => {
          if (!state.brouillon) return state;
          return {
            brouillon: {
              ...state.brouillon,
              paniers: state.brouillon.paniers.map((panier) => ({
                ...panier,
                articles: panier.articles.map((article) =>
                  article.id === ligneId ? { ...article, validationUtilisateur: true } : article,
                ),
              })),
            },
          };
        }),
      appliquerRafraichissement: (resultats, collecteLe) =>
        set((state) => {
          if (!state.brouillon) return state;
          const parLigne = new Map(resultats.map((resultat) => [resultat.ligneId, resultat]));
          return {
            brouillon: {
              ...state.brouillon,
              collecteLe,
              paniers: state.brouillon.paniers.map((panier) => ({
                ...panier,
                articles: panier.articles.map((article) => {
                  if (!parLigne.has(article.id)) return article;
                  const resultat = parLigne.get(article.id);
                  const produit = resultat?.produit;
                  if (!produit) {
                    return { ...article, disponibilite: 'non_confirmee', derniereVerificationLe: collecteLe };
                  }
                  const paquets = calculerPaquets(
                    {
                      quantite: article.besoinQuantite ?? article.quantite,
                      unite: article.besoinUnite ?? 'piece',
                    },
                    produit.taille,
                  );
                  return {
                    ...article,
                    produitId: produit.id,
                    produit: produit.nom,
                    marque: produit.marque,
                    format: produit.format,
                    taillePaquet: produit.taille,
                    prixUnitaire: produit.prix,
                    quantite: paquets.nombrePaquets,
                    nombrePaquets: paquets.nombrePaquets,
                    formatCompatible: paquets.formatCompatible,
                    pertinence: produit.pertinence,
                    validationRequise: produit.validationRequise,
                    validationUtilisateur: true,
                    selectionAutomatique: true,
                    raisonsCorrespondance: produit.raisonsCorrespondance,
                    remplacementDe:
                      resultat.resolution === 'equivalent_automatique'
                        ? {
                            produit: article.produit,
                            montant: Math.round(article.prixUnitaire * article.quantite * 100) / 100,
                          }
                        : article.remplacementDe,
                    disponibilite: 'resultat_catalogue',
                    derniereVerificationLe: collecteLe,
                  };
                }),
              })),
            },
          };
        }),
      reprendreDepuisCommande: (commande) =>
        set({
          brouillon: {
            id: `reprise-${commande.id}-${Date.now()}`,
            npa: '',
            strategie: commande.strategie,
            paniers: commande.paniers.map((panier) => ({
              enseigne: panier.enseigne,
              articles: panier.articles.map((article, index) => ({
                ...article,
                id: `reprise:${panier.enseigne}:${article.produitId}:${index}:${Date.now()}`,
                disponibilite: 'non_confirmee',
              })),
            })),
            articlesNonTrouves: [],
            source: 'SwissGroceries',
            collecteLe: commande.collecteLe,
            adresseId: null,
            livraisons: [],
            paiementEnCours: false,
            creeLe: new Date().toISOString(),
          },
        }),
      definirAdresse: (adresseId) =>
        set((state) =>
          state.brouillon
            ? {
                brouillon: { ...state.brouillon, adresseId },
              }
            : state,
        ),
      definirLivraisons: (livraisons) =>
        set((state) =>
          state.brouillon
            ? {
                brouillon: { ...state.brouillon, livraisons },
              }
            : state,
        ),
      definirPaiementEnCours: (paiementEnCours) =>
        set((state) =>
          state.brouillon
            ? {
                brouillon: { ...state.brouillon, paiementEnCours },
              }
            : state,
        ),
      reset: () => set({ brouillon: null }),
    }),
    {
      name: 'coursia_panier_live_v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        brouillon: state.brouillon ? { ...state.brouillon, paiementEnCours: false } : null,
      }),
    },
  ),
);
