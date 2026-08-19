import type { ResultatCommandeSimulee } from '@/lib/simulateurConnecteurMarchand';
import { journaliserEtapeCheckout } from '@/lib/telemetrieCheckout';
import type { Enseigne } from '@/types';

export interface AllocationPaiementDemo {
  enseigne: Enseigne;
  montant: number;
  referenceCommande: `SIM-${string}`;
}

export interface PaiementUniqueDemo {
  nature: 'simulation';
  statut: 'simulation_preparee';
  reference: `PAY-DEMO-${string}`;
  montantTotal: number;
  allocations: AllocationPaiementDemo[];
  debite: false;
}

export class ErreurPaiementUniqueDemo extends Error {
  constructor(
    public readonly code:
      | 'AUCUNE_COMMANDE'
      | 'COMMANDE_NON_SIMULEE'
      | 'ENSEIGNE_DUPLIQUEE'
      | 'MONTANT_INVALIDE',
  ) {
    super(code);
  }
}

export function preparerPaiementUniqueDemo(
  confirmations: readonly ResultatCommandeSimulee[],
  cleIdempotence: string,
): PaiementUniqueDemo {
  if (confirmations.length === 0) throw new ErreurPaiementUniqueDemo('AUCUNE_COMMANDE');
  if (confirmations.some((confirmation) => confirmation.nature !== 'simulation' || confirmation.transmise)) {
    throw new ErreurPaiementUniqueDemo('COMMANDE_NON_SIMULEE');
  }
  const enseignes = new Set(confirmations.map((confirmation) => confirmation.enseigne));
  if (enseignes.size !== confirmations.length) {
    throw new ErreurPaiementUniqueDemo('ENSEIGNE_DUPLIQUEE');
  }
  if (confirmations.some((confirmation) => !Number.isFinite(confirmation.montant) || confirmation.montant < 0)) {
    throw new ErreurPaiementUniqueDemo('MONTANT_INVALIDE');
  }
  const allocations = confirmations.map((confirmation) => ({
    enseigne: confirmation.enseigne,
    montant: confirmation.montant,
    referenceCommande: confirmation.reference,
  }));
  const montantTotal = Math.round(allocations.reduce((total, allocation) => total + allocation.montant, 0) * 100) / 100;
  journaliserEtapeCheckout({ etape: 'paiement_unique_demo', resultat: 'succes' });
  return {
    nature: 'simulation',
    statut: 'simulation_preparee',
    reference: `PAY-DEMO-${cleIdempotence.replace(/[^a-zA-Z0-9-]/g, '')}`,
    montantTotal,
    allocations,
    debite: false,
  };
}
