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

export interface LignePanierLive {
  id: string;
  produitId: string;
  demande: string;
  produit: string;
  marque?: string;
  format?: string;
  quantite: number;
  prixUnitaire: number;
  urlProduit?: string;
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
      quantite: article.quantite,
      prixUnitaire: article.prixUnitaire,
      urlProduit: article.urlProduit,
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
          const remplacee: LignePanierLive = {
            ...ligneSource,
            id: `${produit.enseigne}:${produit.id}:${Date.now()}`,
            produitId: produit.id,
            produit: produit.nom,
            marque: produit.marque,
            format: produit.format,
            prixUnitaire: produit.prix,
            quantite: 1,
            urlProduit: undefined,
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
