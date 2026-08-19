import { rechercherProduitsLive } from '@/lib/swissGroceriesRepository';
import { rafraichirPrixPanier } from '@/lib/rafraichissementPanier';
import type { LignePanierLive } from '@/stores/panierLiveStore';

jest.mock('@/lib/swissGroceriesRepository', () => ({
  rechercherProduitsLive: jest.fn(),
}));

const mockRechercher = rechercherProduitsLive as jest.MockedFunction<typeof rechercherProduitsLive>;

const ligne: LignePanierLive = {
  id: 'migros:ancien:0',
  produitId: 'ancien',
  demande: 'lait entier',
  produit: 'Lait entier 1 l',
  quantite: 1,
  prixUnitaire: 2,
};

describe('rafraichirPrixPanier', () => {
  beforeEach(() => jest.clearAllMocks());

  it('conserve la même référence quand elle existe encore', async () => {
    mockRechercher.mockResolvedValue([
      {
        id: 'ancien',
        enseigne: 'migros',
        nom: 'Lait entier 1 l',
        prix: 2.1,
        pertinence: 'forte',
        validationRequise: false,
        raisonsCorrespondance: ['nom'],
      },
    ]);

    const resultat = await rafraichirPrixPanier([{ ligne, enseigne: 'migros' }]);
    expect(resultat.resultats[0]).toMatchObject({
      ligneId: ligne.id,
      resolution: 'identique',
      produit: { id: 'ancien' },
    });
  });

  it('choisit automatiquement un équivalent fiable dans la même enseigne', async () => {
    mockRechercher.mockResolvedValue([
      {
        id: 'coop-moins-cher',
        enseigne: 'coop',
        nom: 'Lait entier',
        prix: 1.5,
        pertinence: 'forte',
        validationRequise: false,
        raisonsCorrespondance: ['nom'],
      },
      {
        id: 'migros-equivalent',
        enseigne: 'migros',
        nom: 'Lait entier UHT',
        prix: 2.1,
        pertinence: 'moyenne',
        validationRequise: true,
        raisonsCorrespondance: ['partiel'],
      },
    ]);

    const resultat = await rafraichirPrixPanier([{ ligne, enseigne: 'migros' }], {
      substitutionMode: 'automatique_equivalent',
      variationPrixMaxPct: 10,
      marquesPreferees: [],
      marquesRefusees: [],
      livraisonSansContact: false,
      instructionsLivraison: '',
      creneauPrefere: 'indifferent',
      fraisLivraisonMax: 20,
      enseignesAutorisees: [],
    });
    expect(resultat.resultats[0]).toMatchObject({
      resolution: 'equivalent_automatique',
      produit: { id: 'migros-equivalent' },
    });
  });

  it('ne remplace pas une variante contradictoire ou trop chère', async () => {
    mockRechercher.mockResolvedValue([
      {
        id: 'ecreme',
        enseigne: 'migros',
        nom: 'Lait écrémé',
        prix: 1.8,
        pertinence: 'moyenne',
        validationRequise: true,
        raisonsCorrespondance: ['partiel', 'variante_a_verifier'],
      },
      {
        id: 'cher',
        enseigne: 'migros',
        nom: 'Lait entier premium',
        prix: 2.5,
        pertinence: 'forte',
        validationRequise: false,
        raisonsCorrespondance: ['nom'],
      },
    ]);

    const resultat = await rafraichirPrixPanier([{ ligne, enseigne: 'migros' }]);
    expect(resultat.resultats[0]).toEqual({
      ligneId: ligne.id,
      produit: null,
      resolution: 'indisponible',
    });
  });
});
