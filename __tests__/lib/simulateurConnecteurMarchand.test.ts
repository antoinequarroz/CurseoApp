import { ErreurSimulationMarchand, SimulateurConnecteurMarchand } from '@/lib/simulateurConnecteurMarchand';

const ligne = {
  id: 'l1',
  produitId: 'p1',
  demande: 'lait',
  produit: 'Lait',
  quantite: 2,
  prixUnitaire: 1.5,
} as const;

describe('SimulateurConnecteurMarchand', () => {
  it('exécute le parcours sans paiement ni transmission', () => {
    const simulateur = new SimulateurConnecteurMarchand('coop');
    simulateur.configurerArticles([ligne]);
    simulateur.verifierStock();
    simulateur.resoudreSubstitutions('demander');
    simulateur.reserverCreneau();
    expect(simulateur.confirmerMontant(7.9)).toBe(10.9);
    expect(simulateur.creerCommandeSimulee('cle-1')).toEqual({
      nature: 'simulation',
      transmise: false,
      reference: 'SIM-coop-cle-1',
      enseigne: 'coop',
      montant: 10.9,
    });
    expect(simulateur.creerCommandeSimulee('cle-1').transmise).toBe(false);
  });

  it('refuse une transition hors ordre', () => {
    const simulateur = new SimulateurConnecteurMarchand('coop');
    expect(() => simulateur.reserverCreneau()).toThrow(ErreurSimulationMarchand);
  });

  it('refuse une substitution lorsque la règle vaut jamais', () => {
    const simulateur = new SimulateurConnecteurMarchand('coop');
    simulateur.configurerArticles([{ ...ligne, disponibilite: 'non_confirmee' }]);
    simulateur.verifierStock();
    expect(() => simulateur.resoudreSubstitutions('jamais')).toThrow('SUBSTITUTION_NON_RESOLUE');
  });
});
