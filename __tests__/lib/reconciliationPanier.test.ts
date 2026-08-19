import { reconcilierPanier } from '@/lib/reconciliationPanier';
import type { BrouillonPanierLive } from '@/stores/panierLiveStore';

const base: BrouillonPanierLive = {
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
          id: 'l1',
          produitId: 'p1',
          demande: 'lait entier',
          produit: 'Lait écrémé',
          quantite: 1,
          prixUnitaire: 2,
          nombrePaquets: 2,
          formatCompatible: true,
          validationRequise: true,
          disponibilite: 'resultat_catalogue',
        },
      ],
    },
  ],
};

describe('reconcilierPanier', () => {
  it('automatise la correspondance et bloque seulement une quantité insuffisante', () => {
    const resultat = reconcilierPanier(base);
    expect(resultat.estPret).toBe(false);
    expect(resultat.bloquants.map((probleme) => probleme.code)).toEqual(['quantite_insuffisante']);
    expect(resultat.attentions.map((probleme) => probleme.code)).toContain('correspondance_automatique');
  });

  it('bloque le checkout si un produit est absent ou non confirmé en ligne', () => {
    const resultat = reconcilierPanier({
      ...base,
      articlesNonTrouves: ['papier cuisson'],
      paniers: [
        {
          ...base.paniers[0]!,
          articles: [
            {
              ...base.paniers[0]!.articles[0]!,
              quantite: 2,
              validationUtilisateur: true,
              formatCompatible: false,
              disponibilite: 'non_confirmee',
            },
          ],
        },
      ],
    });
    expect(resultat.estPret).toBe(false);
    expect(resultat.bloquants.map((probleme) => probleme.code)).toEqual([
      'disponibilite_inconnue',
      'produit_introuvable',
    ]);
    expect(resultat.attentions.map((probleme) => probleme.code)).toEqual(['format_inconnu']);
  });
});
