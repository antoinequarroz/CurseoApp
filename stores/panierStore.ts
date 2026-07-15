/** Panier optimise par enseigne — calcule depuis la liste de courses + mode d'optimisation. */
import { create } from 'zustand';
import type { Enseigne, ItemCourse, ModeOptimisation, PanierEnseigne, RecapCommande } from '@/types';
import { PRODUITS_COMPARATIFS, trouverPrixProduit } from '@/lib/mocks/prix.mock';

const ENSEIGNES: Enseigne[] = ['coop', 'migros', 'lidl', 'aldi'];

/** Repartit chaque item sur l'enseigne au meilleur prix (mode prix_minimum). */
function optimiserPanier(items: ItemCourse[], mode: ModeOptimisation): RecapCommande {
  const paniers = new Map<Enseigne, PanierEnseigne>(
    ENSEIGNES.map((e) => [e, { enseigne: e, produits: [], montant: 0 }]),
  );

  let montantTotal = 0;
  let montantEnseigneUnique: Record<Enseigne, number> = { coop: 0, migros: 0, lidl: 0, aldi: 0, ottos: 0, manor_food: 0 };

  for (const item of items) {
    const comparatif = trouverPrixProduit(item.produit);
    const enseigneChoisie: Enseigne =
      mode === 'prix_minimum' && comparatif ? comparatif.meilleur_prix : 'migros';

    const prixInfo = comparatif?.prix.find((p) => p.enseigne === enseigneChoisie);
    const prixEstime = prixInfo?.prix_unitaire ?? 3; // valeur par defaut si produit non reference

    const panier = paniers.get(enseigneChoisie);
    if (panier) {
      panier.produits.push(item);
      panier.montant += prixEstime;
    }
    montantTotal += prixEstime;

    for (const p of comparatif?.prix ?? []) {
      montantEnseigneUnique[p.enseigne] += p.prix_unitaire;
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
