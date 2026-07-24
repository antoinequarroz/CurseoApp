/**
 * Panier optimise par enseigne — calcule depuis la liste de courses + mode
 * d'optimisation.
 *
 * COUR-20 : reste volontairement sur lib/mocks/prix.mock.ts, hors perimetre
 * de ce ticket (scope = "le comparateur", app/components/courses/ComparateurPrix.tsx
 * + hooks/usePrix.ts). Brancher ce store sur les prix reels est un chantier
 * different et plus large : `calculer()` devrait devenir asynchrone (une
 * requete par produit de la liste), avec ses propres etats de chargement —
 * pas une simple substitution d'import comme pour le comparateur. Candidat
 * pour un futur ticket dedie.
 */
import { create } from 'zustand';
import type { Enseigne, ItemCourse, ModeOptimisation, PanierEnseigne, PrixProduit, RecapCommande } from '@/types';
import { PRODUITS_COMPARATIFS, trouverPrixProduit } from '@/lib/mocks/prix.mock';

const ENSEIGNES: Enseigne[] = ['coop', 'migros', 'lidl', 'aldi'];
const PRIX_DEFAUT = 3; // valeur par defaut si produit non reference dans le comparatif

/**
 * Choisit l'enseigne pour un produit selon le mode d'optimisation, a partir
 * du classement reel des prix (et non plus toujours 'migros' hors prix_minimum).
 * Limitation connue : le catalogue mock (lib/mocks/prix.mock.ts) n'a pas de
 * tag bio/sante par produit, donc 'bio' et 'sante' restent alignes sur
 * 'equilibre' (prix median) plutot que d'inventer un faux signal qualite.
 */
function enseigneSelonMode(prix: PrixProduit[], mode: ModeOptimisation): Enseigne {
  const classement = [...prix].sort((a, b) => a.prix_unitaire - b.prix_unitaire);
  switch (mode) {
    case 'prix_minimum':
      return classement[0]!.enseigne;
    case 'premium':
      return classement[classement.length - 1]!.enseigne;
    case 'equilibre':
    case 'bio':
    case 'sante':
    default:
      return classement[Math.floor(classement.length / 2)]!.enseigne;
  }
}

/** Repartit chaque item sur l'enseigne selon le mode d'optimisation choisi. */
function optimiserPanier(items: ItemCourse[], mode: ModeOptimisation): RecapCommande {
  const paniers = new Map<Enseigne, PanierEnseigne>(
    ENSEIGNES.map((e) => [e, { enseigne: e, produits: [], montant: 0 }]),
  );

  let montantTotal = 0;
  const montantEnseigneUnique: Record<Enseigne, number> = { coop: 0, migros: 0, lidl: 0, aldi: 0, ottos: 0, manor_food: 0 };

  for (const item of items) {
    const comparatif = trouverPrixProduit(item.produit);
    const enseigneChoisie: Enseigne = comparatif ? enseigneSelonMode(comparatif.prix, mode) : 'migros';

    const prixInfo = comparatif?.prix.find((p) => p.enseigne === enseigneChoisie);
    const prixEstime = prixInfo?.prix_unitaire ?? PRIX_DEFAUT;

    const panier = paniers.get(enseigneChoisie);
    if (panier) {
      panier.produits.push(item);
      panier.montant += prixEstime;
    }
    montantTotal += prixEstime;

    // Prix "si tout achete dans une seule enseigne" — comparatif absent = meme
    // estimation par defaut partout, pour rester coherent avec montantTotal.
    for (const e of ENSEIGNES) {
      const prixEnseigne = comparatif?.prix.find((p) => p.enseigne === e)?.prix_unitaire ?? PRIX_DEFAUT;
      montantEnseigneUnique[e] += prixEnseigne;
    }
  }

  const montantPlusCher = Math.max(...ENSEIGNES.map((e) => montantEnseigneUnique[e]), montantTotal);
  const economies = Math.max(0, montantPlusCher - montantTotal);

  return {
    paniers: Array.from(paniers.values()).filter((p) => p.produits.length > 0),
    montant_total: Math.round(montantTotal * 100) / 100,
    economies: Math.round(economies * 100) / 100,
    mode_optimisation: mode,
  };
}

interface PanierState {
  mode: ModeOptimisation;
  recap: RecapCommande | null;
  setMode: (mode: ModeOptimisation) => void;
  calculer: (items: ItemCourse[]) => void;
  reset: () => void;
}

export const usePanierStore = create<PanierState>((set, get) => ({
  mode: 'prix_minimum',
  recap: null,
  setMode: (mode) => {
    set({ mode });
    get().calculer(get().recap?.paniers.flatMap((p) => p.produits) ?? []);
  },
  calculer: (items) => set((state) => ({ recap: optimiserPanier(items, state.mode) })),
  reset: () => set({ mode: 'prix_minimum', recap: null }),
}));

export { PRODUITS_COMPARATIFS };
