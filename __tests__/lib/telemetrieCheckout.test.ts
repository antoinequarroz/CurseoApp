import { enregistrerClientObservabilite } from '@/lib/observabiliteClient';
import { journaliserEtapeCheckout, signalerErreurCheckout } from '@/lib/telemetrieCheckout';

describe('télémétrie checkout sans PII', () => {
  afterEach(() => enregistrerClientObservabilite(null));

  it('n’envoie que l’étape, l’enseigne, la tentative et un code technique', () => {
    const client = { addBreadcrumb: jest.fn(), captureException: jest.fn() };
    enregistrerClientObservabilite(client);
    journaliserEtapeCheckout({
      etape: 'synchronisation_panier',
      resultat: 'nouvelle_tentative',
      enseigne: 'coop',
      tentative: 2,
      code: 'TIMEOUT',
    });
    signalerErreurCheckout({ etape: 'synchronisation_panier', enseigne: 'coop', code: 'TIMEOUT' });

    expect(client.addBreadcrumb).toHaveBeenCalledWith({
      category: 'checkout.marchand',
      level: 'info',
      message: 'synchronisation_panier:nouvelle_tentative',
      data: { enseigne: 'coop', tentative: 2, code: 'TIMEOUT' },
    });
    expect(client.captureException).toHaveBeenCalledWith(expect.any(Error), {
      tags: { etape_checkout: 'synchronisation_panier', enseigne: 'coop', code_checkout: 'TIMEOUT' },
    });
    expect(JSON.stringify(client.addBreadcrumb.mock.calls)).not.toMatch(/adresse|email|produit/i);
  });
});
