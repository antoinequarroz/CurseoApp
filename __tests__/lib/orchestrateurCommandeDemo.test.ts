import { orchestrerCommandeDemo } from '@/lib/orchestrateurCommandeDemo';
import { PREFERENCES_COURSES_DEFAUT } from '@/lib/preferencesCoursesRepository';
import type { BrouillonPanierLive } from '@/stores/panierLiveStore';

const brouillon: BrouillonPanierLive = {
  id: 'b-1',
  npa: '1003',
  strategie: 'split_cart',
  articlesNonTrouves: [],
  source: 'SwissGroceries',
  collecteLe: '2026-08-19T12:00:00Z',
  adresseId: null,
  livraisons: [],
  paiementEnCours: false,
  creeLe: '2026-08-19T12:00:00Z',
  paniers: [
    {
      enseigne: 'coop',
      articles: [
        { id: 'c1', produitId: 'p1', demande: 'lait', produit: 'Lait', quantite: 1, prixUnitaire: 2 },
      ],
    },
    {
      enseigne: 'migros',
      articles: [
        { id: 'm1', produitId: 'p2', demande: 'pain', produit: 'Pain', quantite: 1, prixUnitaire: 3 },
      ],
    },
  ],
};

describe('orchestrateurCommandeDemo', () => {
  it('simule indépendamment chaque enseigne', async () => {
    const resultat = await orchestrerCommandeDemo(
      brouillon,
      [
        { enseigne: 'coop', id: 'lc', libelle: 'Standard', prix: 1 },
        { enseigne: 'migros', id: 'lm', libelle: 'Standard', prix: 2 },
      ],
      PREFERENCES_COURSES_DEFAUT,
    );
    expect(resultat.echecs).toEqual([]);
    expect(resultat.confirmations).toHaveLength(2);
    expect(resultat.confirmations.every((confirmation) => confirmation.transmise === false)).toBe(true);
    expect(resultat.paiementPossible).toBe(true);
    expect(resultat.etats.map((etat) => etat.statut)).toEqual(['pret', 'pret']);
  });

  it('annule les paniers déjà prêts si une enseigne échoue', async () => {
    const avecIndisponible = {
      ...brouillon,
      paniers: [
        {
          ...brouillon.paniers[0]!,
          articles: [{ ...brouillon.paniers[0]!.articles[0]!, disponibilite: 'non_confirmee' as const }],
        },
        brouillon.paniers[1]!,
      ],
    };
    const resultat = await orchestrerCommandeDemo(avecIndisponible, [], {
      ...PREFERENCES_COURSES_DEFAUT,
      substitutionMode: 'jamais',
    });
    expect(resultat.confirmations).toHaveLength(0);
    expect(resultat.echecs).toEqual([{ enseigne: 'coop', code: 'SUBSTITUTION_NON_RESOLUE' }]);
    expect(resultat.annulations).toEqual(['migros']);
    expect(resultat.paiementPossible).toBe(false);
  });

  it('réessaie une erreur temporaire puis réussit sans doubler le panier', async () => {
    let tentatives = 0;
    const resultat = await orchestrerCommandeDemo(
      { ...brouillon, paniers: [brouillon.paniers[0]!] },
      [],
      PREFERENCES_COURSES_DEFAUT,
      {
        maxTentatives: 2,
        creerConnecteur: (enseigne) => ({
          enseigne,
          capacites: {
            mode: 'simulation',
            catalogue: false,
            disponibilite: true,
            panier: true,
            livraison: true,
            commande: true,
            paiement: false,
            transmissionCommande: false,
          },
          synchroniserPanier: async () => {
            tentatives += 1;
            if (tentatives === 1) throw new Error('ERREUR_TEMPORAIRE');
            return { panierId: 'p', articlesTraites: 1, articlesTotal: 1 };
          },
          verifierDisponibilite: async () => undefined,
          reserverLivraison: async () => undefined,
          preparerCommande: async () => ({
            nature: 'simulation',
            transmise: false,
            reference: 'SIM-coop-reprise',
            montant: 2,
          }),
          annulerPanier: async () => undefined,
        }),
      },
    );
    expect(tentatives).toBe(2);
    expect(resultat.paiementPossible).toBe(true);
    expect(resultat.etats[0]?.tentative).toBe(2);
  });

  it('refuse un connecteur marchand même si ses capacités sont complètes', async () => {
    const resultat = await orchestrerCommandeDemo(
      { ...brouillon, paniers: [brouillon.paniers[0]!] },
      [],
      PREFERENCES_COURSES_DEFAUT,
      {
        creerConnecteur: (enseigne) => ({
          enseigne,
          capacites: {
            mode: 'marchand',
            catalogue: true,
            disponibilite: true,
            panier: true,
            livraison: true,
            commande: true,
            paiement: true,
            transmissionCommande: true,
          },
          synchroniserPanier: async () => ({ panierId: 'interdit', articlesTraites: 1, articlesTotal: 1 }),
          verifierDisponibilite: async () => undefined,
          reserverLivraison: async () => undefined,
          preparerCommande: async () => ({ nature: 'marchand', transmise: true, reference: 'x', montant: 2 }),
          annulerPanier: async () => undefined,
        }),
      },
    );
    expect(resultat.paiementPossible).toBe(false);
    expect(resultat.echecs).toEqual([{ enseigne: 'coop', code: 'CONNECTEUR_DEMO_INVALIDE' }]);
  });
});
