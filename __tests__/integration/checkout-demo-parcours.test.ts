import { comparerSubstitution } from '@/lib/correspondanceProduit';
import { genererLivraisonsDemo } from '@/lib/livraisonsDemo';
import { orchestrerCommandeDemo } from '@/lib/orchestrateurCommandeDemo';
import { PREFERENCES_COURSES_DEFAUT } from '@/lib/preferencesCoursesRepository';
import { reconcilierPanier } from '@/lib/reconciliationPanier';
import { trouverLignePanier, usePanierLiveStore } from '@/stores/panierLiveStore';
import type { OptimisationCoursesLive, OptionOptimisationCoursesLive } from '@/lib/swissGroceriesRepository';

const option: OptionOptimisationCoursesLive = {
  id: 'single:migros:3',
  strategie: 'single_store',
  montantTotal: 3,
  articlesNonTrouves: [],
  arrets: [
    {
      enseigne: 'migros',
      montant: 3,
      articles: [
        {
          produitId: 'pommes-migros',
          demande: 'pommes',
          produit: 'Pommes Gala',
          quantite: 1,
          prixUnitaire: 3,
          montant: 3,
          format: '1 kg',
          taillePaquet: { value: 1, unit: 'kg' },
          besoinQuantite: 750,
          besoinUnite: 'g',
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
  strategie: 'single_store',
  montantTotal: 3,
  arrets: option.arrets,
  articlesNonTrouves: [],
  economieEstimee: null,
  source: 'SwissGroceries',
  collecteLe: '2026-08-19T10:00:00.000Z',
  alternatives: [],
};

describe('parcours checkout de démonstration COUR-84', () => {
  beforeEach(() => usePanierLiveStore.getState().reset());

  it('va de l optimisation à une confirmation multi-étapes non transmise', async () => {
    usePanierLiveStore.getState().creerDepuisOptimisation(resultat, option, '1003');
    const initial = usePanierLiveStore.getState().brouillon!;
    const source = trouverLignePanier(initial, initial.paniers[0]!.articles[0]!.id)!;
    const remplacement = {
      id: 'pommes-coop',
      enseigne: 'coop' as const,
      nom: 'Pommes Gala Bio',
      marque: 'Bio Suisse',
      prix: 2.5,
      format: '1 kg',
      taille: { value: 1, unit: 'kg' },
      pertinence: 'forte' as const,
      validationRequise: false,
      raisonsCorrespondance: ['nom' as const],
    };

    expect(comparerSubstitution({ ...source.ligne, enseigne: source.enseigne }, remplacement)).toMatchObject({
      nouveauMontant: 2.5,
      changeEnseigne: true,
    });
    usePanierLiveStore.getState().remplacerArticle(source.ligne.id, remplacement);

    const brouillon = usePanierLiveStore.getState().brouillon!;
    expect(reconcilierPanier(brouillon).estPret).toBe(true);
    const livraisons = genererLivraisonsDemo(brouillon, {}, 'soir', new Date('2026-08-19T08:00:00.000Z'));
    expect(livraisons[0]?.creneau?.periode).toBe('soir');

    const orchestration = await orchestrerCommandeDemo(
      brouillon,
      livraisons,
      PREFERENCES_COURSES_DEFAUT,
    );
    expect(orchestration.echecs).toEqual([]);
    expect(orchestration.confirmations).toEqual([
      expect.objectContaining({ enseigne: 'coop', nature: 'simulation', transmise: false }),
    ]);
  });
});
