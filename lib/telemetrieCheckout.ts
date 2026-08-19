import { obtenirClientObservabilite } from '@/lib/observabiliteClient';
import type { Enseigne } from '@/types';

export type EtapeCheckout =
  | 'synchronisation_panier'
  | 'verification_stock'
  | 'reservation_livraison'
  | 'preparation_commande'
  | 'annulation_globale'
  | 'paiement_unique_demo';

export interface EvenementCheckoutSain {
  etape: EtapeCheckout;
  resultat: 'debut' | 'succes' | 'echec' | 'nouvelle_tentative';
  enseigne?: Enseigne;
  tentative?: number;
  code?: string;
}

/** La forme fermée interdit d'ajouter adresse, email, recherche ou contenu du panier. */
export function journaliserEtapeCheckout(evenement: EvenementCheckoutSain): void {
  obtenirClientObservabilite()?.addBreadcrumb({
    category: 'checkout.marchand',
    level: evenement.resultat === 'echec' ? 'warning' : 'info',
    message: `${evenement.etape}:${evenement.resultat}`,
    data: {
      enseigne: evenement.enseigne,
      tentative: evenement.tentative,
      code: evenement.code,
    },
  });
}

export function signalerErreurCheckout(evenement: Omit<EvenementCheckoutSain, 'resultat'>): void {
  obtenirClientObservabilite()?.captureException(new Error(`CHECKOUT_${evenement.code ?? 'INCONNU'}`), {
    tags: {
      etape_checkout: evenement.etape,
      enseigne: evenement.enseigne ?? 'globale',
      code_checkout: evenement.code ?? 'INCONNU',
    },
  });
}
