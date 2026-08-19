import { ConnecteurMarchandSimule } from '@/lib/connecteurMarchandSimule';
import { verifierConformiteConnecteurMarchand } from '@/lib/conformiteConnecteurMarchand';
import { CAPACITES_SIMULATEUR_CHECKOUT, type ConnecteurMarchand } from '@/lib/connecteursEnseignes';
import type { Enseigne } from '@/types';

describe('conformiteConnecteurMarchand', () => {
  it('valide le connecteur simulé sur le contrat complet', async () => {
    const rapport = await verifierConformiteConnecteurMarchand(
      (enseigne) => new ConnecteurMarchandSimule(enseigne),
      'migros',
    );
    expect(rapport.conforme).toBe(true);
    expect(rapport.controles).toHaveLength(6);
    expect(rapport.controles.every((controle) => controle.ok)).toBe(true);
  });

  it('refuse un connecteur non idempotent et qui transmet en simulation', async () => {
    let compteur = 0;
    const creer = (enseigne: Enseigne): ConnecteurMarchand => ({
      enseigne,
      capacites: { ...CAPACITES_SIMULATEUR_CHECKOUT, transmissionCommande: true },
      synchroniserPanier: async () => ({
        panierId: `panier-${++compteur}`,
        articlesTraites: 1,
        articlesTotal: 1,
      }),
      verifierDisponibilite: async () => undefined,
      reserverLivraison: async () => undefined,
      preparerCommande: async () => ({
        nature: 'simulation',
        transmise: true,
        reference: 'INTERDITE',
        montant: 1,
      }),
      annulerPanier: async () => undefined,
    });
    const rapport = await verifierConformiteConnecteurMarchand(creer, 'coop');
    expect(rapport.conforme).toBe(false);
    expect(rapport.controles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'SIMULATION_SANS_TRANSMISSION', ok: false }),
        expect.objectContaining({ code: 'IDEMPOTENCE_PANIER', ok: false }),
        expect.objectContaining({ code: 'RESULTAT_COHERENT', ok: false }),
      ]),
    );
  });
});
