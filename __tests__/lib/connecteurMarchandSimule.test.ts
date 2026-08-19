import { ConnecteurMarchandSimule } from '@/lib/connecteurMarchandSimule';

describe('connecteur marchand simulé', () => {
  it('respecte le contrat futur sans paiement ni transmission', async () => {
    const connecteur = new ConnecteurMarchandSimule('migros');
    const panier = await connecteur.synchroniserPanier({
      cleIdempotence: 'b-1',
      articles: [{ produitId: 'p-1', quantite: 2, prixUnitaire: 3 }],
    });
    await connecteur.verifierDisponibilite(panier.panierId, 'automatique_equivalent');
    await connecteur.reserverLivraison(panier.panierId, 'soir');
    const commande = await connecteur.preparerCommande({
      panierId: panier.panierId,
      cleIdempotence: 'b-1',
      fraisLivraison: 4,
    });
    expect(connecteur.capacites).toMatchObject({
      mode: 'simulation',
      paiement: false,
      transmissionCommande: false,
    });
    expect(commande).toMatchObject({ nature: 'simulation', transmise: false, montant: 10 });
  });
});
