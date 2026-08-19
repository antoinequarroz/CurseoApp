import { genererLivraisonsDemo } from '@/lib/livraisonsDemo';
import type { BrouillonPanierLive } from '@/stores/panierLiveStore';

function brouillon(prix: number): BrouillonPanierLive {
  return {
    id: 'b',
    npa: '1003',
    strategie: 'single_store',
    articlesNonTrouves: [],
    source: 'SwissGroceries',
    collecteLe: '2026-08-19T10:00:00Z',
    adresseId: null,
    livraisons: [],
    paiementEnCours: false,
    creeLe: '2026-08-19T10:00:00Z',
    paniers: [
      {
        enseigne: 'migros',
        articles: [
          {
            id: 'l',
            produitId: 'p',
            demande: 'pommes',
            produit: 'Pommes',
            quantite: 1,
            prixUnitaire: prix,
          },
        ],
      },
    ],
  };
}

describe('livraisonsDemo', () => {
  it('facture des frais fictifs sous le seuil', () => {
    expect(genererLivraisonsDemo(brouillon(20))[0]?.prix).toBe(7.9);
  });

  it('simule une livraison gratuite au-dessus du seuil', () => {
    expect(genererLivraisonsDemo(brouillon(80))[0]?.prix).toBe(0);
  });
});
