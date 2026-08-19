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
  it('simule indépendamment chaque enseigne', () => {
    const resultat = orchestrerCommandeDemo(
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
  });

  it('isole l’échec de substitution d’une enseigne', () => {
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
    const resultat = orchestrerCommandeDemo(avecIndisponible, [], {
      ...PREFERENCES_COURSES_DEFAUT,
      substitutionMode: 'jamais',
    });
    expect(resultat.confirmations).toHaveLength(1);
    expect(resultat.echecs).toEqual([{ enseigne: 'coop', code: 'SUBSTITUTION_NON_RESOLUE' }]);
  });
});
