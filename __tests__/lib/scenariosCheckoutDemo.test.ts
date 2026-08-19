import { creerFabriqueScenarioCheckout } from '@/lib/scenariosCheckoutDemo';
import { orchestrerCommandeDemo } from '@/lib/orchestrateurCommandeDemo';
import { PREFERENCES_COURSES_DEFAUT } from '@/lib/preferencesCoursesRepository';
import type { BrouillonPanierLive } from '@/stores/panierLiveStore';

const brouillon: BrouillonPanierLive = {
  id: 'scenario-1',
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

describe('scenariosCheckoutDemo', () => {
  it('reproduit un timeout Coop et annule Migros', async () => {
    const resultat = await orchestrerCommandeDemo(
      brouillon,
      [],
      PREFERENCES_COURSES_DEFAUT,
      { creerConnecteur: creerFabriqueScenarioCheckout('timeout_coop') },
    );
    expect(resultat.echecs).toEqual([{ enseigne: 'coop', code: 'TIMEOUT' }]);
    expect(resultat.annulations).toEqual(['migros']);
    expect(resultat.etats.find((etat) => etat.enseigne === 'coop')).toMatchObject({
      statut: 'erreur_temporaire',
      tentative: 2,
    });
  });

  it('reproduit un panier Migros partiel sans payer', async () => {
    const resultat = await orchestrerCommandeDemo(
      brouillon,
      [],
      PREFERENCES_COURSES_DEFAUT,
      { creerConnecteur: creerFabriqueScenarioCheckout('panier_partiel_migros') },
    );
    expect(resultat.echecs).toEqual([{ enseigne: 'migros', code: 'PANIER_PARTIEL' }]);
    expect(resultat.paiementPossible).toBe(false);
  });
});
