import { enregistrerCommandeDemo } from '@/lib/commandesDemoRepository';
import { supabase } from '@/lib/supabase';
import type { BrouillonPanierLive, LivraisonDemo } from '@/stores/panierLiveStore';
import type { AdresseLivraison } from '@/types';

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

const mockFrom = supabase.from as jest.Mock;

const brouillon: BrouillonPanierLive = {
  id: 'brouillon-123',
  npa: '1003',
  strategie: 'split_cart',
  paniers: [
    {
      enseigne: 'coop',
      articles: [
        {
          id: 'ligne-1',
          produitId: 'produit-1',
          demande: 'lait',
          produit: 'Lait entier',
          quantite: 2,
          prixUnitaire: 1.5,
        },
      ],
    },
  ],
  articlesNonTrouves: [],
  source: 'SwissGroceries',
  collecteLe: '2026-08-19T10:00:00.000Z',
  adresseId: 'adresse-1',
  livraisons: [],
  paiementEnCours: false,
  creeLe: '2026-08-19T10:01:00.000Z',
};

const adresse: AdresseLivraison = {
  id: 'adresse-1',
  libelle: 'Maison',
  rue: 'Rue du Test 1',
  npa: '1003',
  ville: 'Lausanne',
  complement: null,
  estDefaut: true,
};

const livraisons: LivraisonDemo[] = [
  { enseigne: 'coop', id: 'demo-standard-coop', libelle: 'Livraison standard (simulation)', prix: 7.9 },
];

describe('commandesDemoRepository', () => {
  beforeEach(() => mockFrom.mockReset());

  it('enregistre uniquement un instantané explicitement simulé', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: { id: 'commande-1', paiement_reference: 'DEMO-brouillon-123', montant_total: 10.9 },
      error: null,
    });
    const select = jest.fn(() => ({ maybeSingle }));
    const insert = jest.fn(() => ({ select }));
    mockFrom.mockReturnValue({ insert });

    await expect(
      enregistrerCommandeDemo({ profilId: 'profil-1', brouillon, adresse, livraisons }),
    ).resolves.toEqual({ id: 'commande-1', reference: 'DEMO-brouillon-123', montantTotal: 10.9 });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        profil_id: 'profil-1',
        nature: 'simulation',
        statut: 'simulation_confirmee',
        paiement_reference: 'DEMO-brouillon-123',
        montant_total: 10.9,
        adresse_snapshot: expect.objectContaining({ npa: '1003' }),
      }),
    );
  });

  it('retrouve la confirmation existante après un double appui', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'duplicate key' },
    });
    const lectureSingle = jest.fn().mockResolvedValue({
      data: { id: 'commande-1', paiement_reference: 'DEMO-brouillon-123', montant_total: 10.9 },
      error: null,
    });
    const secondEq = jest.fn(() => ({ single: lectureSingle }));
    const firstEq = jest.fn(() => ({ eq: secondEq }));
    mockFrom
      .mockReturnValueOnce({ insert: jest.fn(() => ({ select: jest.fn(() => ({ maybeSingle })) })) })
      .mockReturnValueOnce({ select: jest.fn(() => ({ eq: firstEq })) });

    await expect(
      enregistrerCommandeDemo({ profilId: 'profil-1', brouillon, adresse, livraisons }),
    ).resolves.toEqual({ id: 'commande-1', reference: 'DEMO-brouillon-123', montantTotal: 10.9 });
    expect(firstEq).toHaveBeenCalledWith('profil_id', 'profil-1');
    expect(secondEq).toHaveBeenCalledWith('paiement_reference', 'DEMO-brouillon-123');
  });
});
