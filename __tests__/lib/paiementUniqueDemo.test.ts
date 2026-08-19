import { ErreurPaiementUniqueDemo, preparerPaiementUniqueDemo } from '@/lib/paiementUniqueDemo';

describe('paiement unique de démonstration', () => {
  it('répartit deux commandes simulées sous une référence idempotente unique', () => {
    const paiement = preparerPaiementUniqueDemo(
      [
        { nature: 'simulation', transmise: false, reference: 'SIM-coop-b', enseigne: 'coop', montant: 8 },
        {
          nature: 'simulation',
          transmise: false,
          reference: 'SIM-migros-b',
          enseigne: 'migros',
          montant: 12.5,
        },
      ],
      'brouillon 1',
    );
    expect(paiement).toEqual({
      nature: 'simulation',
      statut: 'simulation_preparee',
      reference: 'PAY-DEMO-brouillon1',
      montantTotal: 20.5,
      allocations: [
        { enseigne: 'coop', montant: 8, referenceCommande: 'SIM-coop-b' },
        { enseigne: 'migros', montant: 12.5, referenceCommande: 'SIM-migros-b' },
      ],
      debite: false,
    });
  });

  it('refuse un paiement vide ou deux allocations pour la même enseigne', () => {
    expect(() => preparerPaiementUniqueDemo([], 'b')).toThrow(
      new ErreurPaiementUniqueDemo('AUCUNE_COMMANDE'),
    );
    expect(() =>
      preparerPaiementUniqueDemo(
        [
          { nature: 'simulation', transmise: false, reference: 'SIM-coop-a', enseigne: 'coop', montant: 1 },
          { nature: 'simulation', transmise: false, reference: 'SIM-coop-b', enseigne: 'coop', montant: 2 },
        ],
        'b',
      ),
    ).toThrow(new ErreurPaiementUniqueDemo('ENSEIGNE_DUPLIQUEE'));
  });
});
