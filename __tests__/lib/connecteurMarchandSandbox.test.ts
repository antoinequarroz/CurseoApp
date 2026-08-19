import { ConnecteurMarchandSandbox, type TransportMarchandSandbox } from '@/lib/connecteurMarchandSandbox';
import { validerAutorisationSandbox } from '@/lib/autorisationSandboxMarchand';
import { verifierConformiteConnecteurMarchand } from '@/lib/conformiteConnecteurMarchand';
import { MANIFEST_SANDBOX_VALIDE, REPONSE_AUTORISATION_VALIDE } from '@/test-utils/connecteurSandbox';

function creerTransport(): TransportMarchandSandbox {
  return {
    synchroniserPanier: jest.fn(async ({ articles }) => ({
      panierId: 'SANDBOX-PANIER-1',
      articlesTraites: articles.length,
      articlesTotal: articles.length,
    })),
    verifierDisponibilite: jest.fn(async () => undefined),
    reserverLivraison: jest.fn(async () => undefined),
    preparerCommande: jest.fn(async () => ({
      nature: 'simulation' as const,
      transmise: false,
      reference: 'SANDBOX-COMMANDE-1',
      montant: 12.5,
    })),
    annulerPanier: jest.fn(async () => undefined),
  };
}

function obtenirAutorisation() {
  const resultat = validerAutorisationSandbox(
    REPONSE_AUTORISATION_VALIDE,
    'coop',
    new Date('2026-08-19T12:01:00.000Z'),
  );
  if (!resultat.autorisee) throw new Error(resultat.raison);
  return resultat.autorisation;
}

describe('ConnecteurMarchandSandbox', () => {
  it('respecte le contrat complet sans exposer son jeton', async () => {
    const rapport = await verifierConformiteConnecteurMarchand(
      () =>
        new ConnecteurMarchandSandbox(
          MANIFEST_SANDBOX_VALIDE,
          obtenirAutorisation(),
          creerTransport(),
          () => new Date('2026-08-19T12:02:00.000Z'),
        ),
      'coop',
    );
    expect(rapport.conforme).toBe(true);
    const connecteur = new ConnecteurMarchandSandbox(
      MANIFEST_SANDBOX_VALIDE,
      obtenirAutorisation(),
      creerTransport(),
      () => new Date('2026-08-19T12:02:00.000Z'),
    );
    expect(JSON.stringify(connecteur)).not.toContain(REPONSE_AUTORISATION_VALIDE.jetonOpaque);
  });

  it('ferme tous les appels après expiration', async () => {
    const connecteur = new ConnecteurMarchandSandbox(
      MANIFEST_SANDBOX_VALIDE,
      obtenirAutorisation(),
      creerTransport(),
      () => new Date('2026-08-19T12:10:00.000Z'),
    );
    await expect(connecteur.synchroniserPanier({ cleIdempotence: 'x', articles: [] })).rejects.toThrow(
      'AUTORISATION_SANDBOX_EXPIREE',
    );
  });

  it('refuse une réponse qui prétend transmettre réellement', async () => {
    const transport = creerTransport();
    transport.preparerCommande = jest.fn(async () => ({
      nature: 'marchand' as const,
      transmise: true as const,
      reference: 'REELLE-INTERDITE',
      montant: 12.5,
    }));
    const connecteur = new ConnecteurMarchandSandbox(
      MANIFEST_SANDBOX_VALIDE,
      obtenirAutorisation(),
      transport,
      () => new Date('2026-08-19T12:02:00.000Z'),
    );
    await expect(
      connecteur.preparerCommande({ panierId: 'p', cleIdempotence: 'c', fraisLivraison: 0 }),
    ).rejects.toThrow('REPONSE_SANDBOX_INVALIDE');
  });
});
