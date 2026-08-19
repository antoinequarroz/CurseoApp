import {
  sousTotalPanier,
  totalLivraisons,
  totalProduits,
  usePanierLiveStore,
} from '@/stores/panierLiveStore';
import type { OptimisationCoursesLive, OptionOptimisationCoursesLive } from '@/lib/swissGroceriesRepository';

const option: OptionOptimisationCoursesLive = {
  id: 'split:migros+coop:8',
  strategie: 'split_cart',
  montantTotal: 8,
  articlesNonTrouves: ['papier cuisson'],
  arrets: [
    {
      enseigne: 'migros',
      montant: 5,
      articles: [
        {
          produitId: 'pomme-1',
          demande: 'pommes',
          produit: 'Pommes Gala',
          quantite: 1,
          prixUnitaire: 5,
          montant: 5,
          format: '1 kg',
          besoinQuantite: 500,
          besoinUnite: 'g',
          nombrePaquets: 1,
          formatCompatible: true,
          pertinence: 'forte',
          validationRequise: false,
          disponibilite: 'resultat_catalogue',
        },
      ],
    },
    {
      enseigne: 'coop',
      montant: 3,
      articles: [
        {
          produitId: 'lait-1',
          demande: 'lait',
          produit: 'Lait entier',
          quantite: 1,
          prixUnitaire: 3,
          montant: 3,
          format: '1 l',
          besoinQuantite: 1,
          besoinUnite: 'l',
          nombrePaquets: 1,
          formatCompatible: true,
          pertinence: 'forte',
          validationRequise: false,
          disponibilite: 'resultat_catalogue',
        },
      ],
    },
  ],
};

const resultat: OptimisationCoursesLive = {
  strategie: option.strategie,
  montantTotal: option.montantTotal,
  arrets: option.arrets,
  articlesNonTrouves: option.articlesNonTrouves,
  economieEstimee: 2,
  source: 'SwissGroceries',
  collecteLe: '2026-08-19T10:00:00.000Z',
  alternatives: [],
};

describe('panierLiveStore', () => {
  beforeEach(() => usePanierLiveStore.getState().reset());

  it('cree un brouillon live sans prix mocke et recalcule les quantites', () => {
    usePanierLiveStore.getState().creerDepuisOptimisation(resultat, option, '1003');
    const brouillon = usePanierLiveStore.getState().brouillon!;
    expect(brouillon).toMatchObject({ npa: '1003', source: 'SwissGroceries', strategie: 'split_cart' });
    expect(totalProduits(brouillon)).toBe(8);

    usePanierLiveStore.getState().definirQuantite(brouillon.paniers[0]!.articles[0]!.id, 2);
    expect(totalProduits(usePanierLiveStore.getState().brouillon!)).toBe(13);
  });

  it('deplace une ligne quand le produit de remplacement vient d une autre enseigne', () => {
    usePanierLiveStore.getState().creerDepuisOptimisation(resultat, option, '1003');
    const ligneId = usePanierLiveStore.getState().brouillon!.paniers[0]!.articles[0]!.id;
    usePanierLiveStore.getState().remplacerArticle(ligneId, {
      id: 'pomme-coop',
      enseigne: 'coop',
      nom: 'Pommes Bio',
      prix: 4.5,
      format: '1 kg',
      taille: { value: 1, unit: 'kg' },
      pertinence: 'forte',
      validationRequise: false,
    });
    const brouillon = usePanierLiveStore.getState().brouillon!;
    expect(brouillon.paniers).toHaveLength(1);
    expect(brouillon.paniers[0]?.articles.map((article) => article.produit)).toEqual([
      'Lait entier',
      'Pommes Bio',
    ]);
    expect(totalProduits(brouillon)).toBe(7.5);
  });

  it('retire les paniers vides et borne les quantites', () => {
    usePanierLiveStore.getState().creerDepuisOptimisation(resultat, option, '1003');
    const premier = usePanierLiveStore.getState().brouillon!.paniers[0]!;
    usePanierLiveStore.getState().definirQuantite(premier.articles[0]!.id, 0);
    expect(sousTotalPanier(usePanierLiveStore.getState().brouillon!.paniers[0]!)).toBe(5);
    usePanierLiveStore.getState().retirerArticle(premier.articles[0]!.id);
    expect(usePanierLiveStore.getState().brouillon!.paniers).toHaveLength(1);
  });

  it('additionne les frais de livraison choisis', () => {
    usePanierLiveStore.getState().creerDepuisOptimisation(resultat, option, '1003');
    usePanierLiveStore.getState().definirLivraisons([
      { enseigne: 'migros', id: 'm', libelle: 'standard_demo', prix: 7.9 },
      { enseigne: 'coop', id: 'c', libelle: 'standard_demo', prix: 0 },
    ]);
    expect(totalLivraisons(usePanierLiveStore.getState().brouillon!)).toBe(7.9);
  });

  it('remplace automatiquement une référence disparue par un équivalent résolu', () => {
    usePanierLiveStore.getState().creerDepuisOptimisation(resultat, option, '1003');
    const ligne = usePanierLiveStore.getState().brouillon!.paniers[0]!.articles[0]!;
    usePanierLiveStore.getState().appliquerRafraichissement(
      [
        {
          ligneId: ligne.id,
          produit: {
            id: 'autre-produit',
            enseigne: 'migros',
            nom: 'Autres pommes',
            prix: 1,
            pertinence: 'moyenne',
            validationRequise: false,
          },
          resolution: 'equivalent_automatique',
        },
      ],
      '2026-08-19T11:00:00.000Z',
    );
    const remplacee = usePanierLiveStore.getState().brouillon!.paniers[0]!.articles[0]!;
    expect(remplacee.produitId).toBe('autre-produit');
    expect(remplacee.prixUnitaire).toBe(1);
    expect(remplacee.disponibilite).toBe('resultat_catalogue');
    expect(remplacee.selectionAutomatique).toBe(true);
    expect(remplacee.remplacementDe?.produit).toBe('Pommes Gala');
    expect(usePanierLiveStore.getState().brouillon!.creeLe).toBe('2026-08-19T11:00:00.000Z');
  });

  it('bloque la disponibilité quand aucun équivalent fiable n existe', () => {
    usePanierLiveStore.getState().creerDepuisOptimisation(resultat, option, '1003');
    const ligne = usePanierLiveStore.getState().brouillon!.paniers[0]!.articles[0]!;
    usePanierLiveStore.getState().appliquerRafraichissement(
      [{ ligneId: ligne.id, produit: null, resolution: 'indisponible' }],
      '2026-08-19T11:00:00.000Z',
    );
    expect(usePanierLiveStore.getState().brouillon!.paniers[0]!.articles[0]!.disponibilite).toBe(
      'non_confirmee',
    );
  });
});
