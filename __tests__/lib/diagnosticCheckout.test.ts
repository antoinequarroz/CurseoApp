import {
  creerDiagnosticCheckout,
  determinerActionRepriseCheckout,
  normaliserCodeErreurCheckout,
} from '@/lib/diagnosticCheckout';
import type { EtatOrchestrationEnseigne } from '@/lib/orchestrateurCommandeDemo';

const temporaire: EtatOrchestrationEnseigne = {
  enseigne: 'coop',
  statut: 'erreur_temporaire',
  tentative: 2,
  articlesTraites: 0,
  articlesTotal: 3,
  code: 'TIMEOUT',
};

describe('diagnosticCheckout', () => {
  it('produit une référence stable sans contenu du panier', () => {
    const diagnostic = creerDiagnosticCheckout(
      [temporaire],
      new Date('2026-08-19T14:00:00.000Z'),
    );
    expect(diagnostic).toMatchObject({
      reference: expect.stringMatching(/^CHK-260819-[A-Z0-9]{6}$/),
      codes: ['TIMEOUT'],
      nombreEnseignes: 1,
      tentativeMax: 2,
      action: 'relancer',
    });
    expect(JSON.stringify(diagnostic)).not.toContain('adresse');
    expect(JSON.stringify(diagnostic)).not.toContain('produit');
  });

  it('remplace tout message fournisseur libre par un code sûr', () => {
    expect(normaliserCodeErreurCheckout('email@example.com token-secret')).toBe('ERREUR_INCONNUE');
  });

  it('renvoie au panier pour une erreur permanente', () => {
    expect(
      determinerActionRepriseCheckout([
        { ...temporaire, statut: 'indisponible', code: 'SUBSTITUTION_NON_RESOLUE' },
      ]),
    ).toBe('corriger_panier');
  });
});
