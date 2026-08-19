import {
  CAPACITES_SANDBOX_PARTENAIRE,
  CAPACITES_SIMULATEUR_CHECKOUT,
  CAPACITES_SWISSGROCERIES,
} from '@/lib/connecteursEnseignes';

describe('contrats connecteurs enseignes', () => {
  it('ne pretend jamais que SwissGroceries peut commander', () => {
    expect(CAPACITES_SWISSGROCERIES).toEqual({
      mode: 'catalogue',
      catalogue: true,
      disponibilite: true,
      panier: false,
      livraison: false,
      commande: false,
      paiement: false,
      transmissionCommande: false,
    });
  });

  it('isole le simulateur du catalogue live', () => {
    expect(CAPACITES_SIMULATEUR_CHECKOUT).toEqual({
      mode: 'simulation',
      catalogue: false,
      disponibilite: false,
      panier: true,
      livraison: true,
      commande: true,
      paiement: false,
      transmissionCommande: false,
    });
  });

  it('isole la sandbox partenaire du paiement et de la transmission', () => {
    expect(CAPACITES_SANDBOX_PARTENAIRE).toMatchObject({
      mode: 'sandbox',
      panier: true,
      livraison: true,
      commande: true,
      paiement: false,
      transmissionCommande: false,
    });
  });
});
