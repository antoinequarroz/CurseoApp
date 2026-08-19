import { genererCreneauxLivraisonDemo, genererLivraisonsDemo } from '@/lib/livraisonsDemo';
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

  it('propose des créneaux déterministes et respecte la préférence du soir', () => {
    const reference = new Date('2026-08-19T08:00:00.000Z');
    const creneaux = genererCreneauxLivraisonDemo('migros', reference);
    expect(creneaux).toHaveLength(6);
    const livraison = genererLivraisonsDemo(brouillon(20), {}, 'soir', reference)[0]!;
    expect(livraison.creneau).toMatchObject({ periode: 'soir', id: 'demo-migros-2026-08-20-soir' });
  });
});
