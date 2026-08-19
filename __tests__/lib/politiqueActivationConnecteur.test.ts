import { evaluerActivationConnecteur } from '@/lib/politiqueActivationConnecteur';
import { CAPACITES_SIMULATEUR_CHECKOUT } from '@/lib/connecteursEnseignes';

const capacitesMarchand = {
  ...CAPACITES_SIMULATEUR_CHECKOUT,
  mode: 'marchand' as const,
  paiement: true,
  transmissionCommande: true,
};

describe('politiqueActivationConnecteur', () => {
  it('reste fermée sans décision explicite', () => {
    expect(evaluerActivationConnecteur({ capacites: CAPACITES_SIMULATEUR_CHECKOUT })).toEqual({
      autorise: false,
      raison: 'MODE_FERME',
    });
  });

  it('autorise uniquement le simulateur sûr quand le coupe-circuit est levé', () => {
    expect(
      evaluerActivationConnecteur({
        mode: 'simulation',
        capacites: CAPACITES_SIMULATEUR_CHECKOUT,
        coupeCircuitDesactive: true,
      }),
    ).toEqual({ autorise: true, raison: 'AUTORISE' });
    expect(
      evaluerActivationConnecteur({
        mode: 'simulation',
        capacites: capacitesMarchand,
        coupeCircuitDesactive: true,
      }).autorise,
    ).toBe(false);
  });

  it('exige conformité et autorisation serveur pour un canary marchand', () => {
    expect(
      evaluerActivationConnecteur({
        mode: 'canary_marchand',
        capacites: capacitesMarchand,
        coupeCircuitDesactive: true,
      }).raison,
    ).toBe('CONFORMITE_NON_PROUVEE');
    expect(
      evaluerActivationConnecteur({
        mode: 'canary_marchand',
        capacites: capacitesMarchand,
        coupeCircuitDesactive: true,
        conformiteVerifiee: true,
      }).raison,
    ).toBe('AUTORISATION_SERVEUR_ABSENTE');
    expect(
      evaluerActivationConnecteur({
        mode: 'canary_marchand',
        capacites: capacitesMarchand,
        coupeCircuitDesactive: true,
        conformiteVerifiee: true,
        autorisationServeur: true,
      }).autorise,
    ).toBe(true);
  });
});
