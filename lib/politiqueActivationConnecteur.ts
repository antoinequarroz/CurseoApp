import type { CapacitesConnecteurEnseigne } from '@/lib/connecteursEnseignes';

export type ModeActivationConnecteur = 'ferme' | 'simulation' | 'canary_marchand';
export type RaisonActivationConnecteur =
  | 'MODE_FERME'
  | 'COUPE_CIRCUIT_ACTIVE'
  | 'CAPACITES_INCOMPATIBLES'
  | 'CONFORMITE_NON_PROUVEE'
  | 'AUTORISATION_SERVEUR_ABSENTE'
  | 'AUTORISE';

export interface DemandeActivationConnecteur {
  mode?: ModeActivationConnecteur;
  capacites: CapacitesConnecteurEnseigne;
  coupeCircuitDesactive?: boolean;
  conformiteVerifiee?: boolean;
  autorisationServeur?: boolean;
}

export interface DecisionActivationConnecteur {
  autorise: boolean;
  raison: RaisonActivationConnecteur;
}

/**
 * Fermé par défaut. Un futur connecteur marchand exige une preuve de conformité
 * et une autorisation serveur; aucun flag client isolé ne peut l'activer.
 */
export function evaluerActivationConnecteur(
  demande: DemandeActivationConnecteur,
): DecisionActivationConnecteur {
  const mode = demande.mode ?? 'ferme';
  if (mode === 'ferme') return { autorise: false, raison: 'MODE_FERME' };
  if (!demande.coupeCircuitDesactive) {
    return { autorise: false, raison: 'COUPE_CIRCUIT_ACTIVE' };
  }

  if (mode === 'simulation') {
    const compatible =
      demande.capacites.mode === 'simulation' &&
      demande.capacites.panier &&
      demande.capacites.livraison &&
      demande.capacites.commande &&
      !demande.capacites.paiement &&
      !demande.capacites.transmissionCommande;
    return compatible
      ? { autorise: true, raison: 'AUTORISE' }
      : { autorise: false, raison: 'CAPACITES_INCOMPATIBLES' };
  }

  const compatibleMarchand =
    demande.capacites.mode === 'marchand' &&
    demande.capacites.panier &&
    demande.capacites.livraison &&
    demande.capacites.commande;
  if (!compatibleMarchand) return { autorise: false, raison: 'CAPACITES_INCOMPATIBLES' };
  if (!demande.conformiteVerifiee) {
    return { autorise: false, raison: 'CONFORMITE_NON_PROUVEE' };
  }
  if (!demande.autorisationServeur) {
    return { autorise: false, raison: 'AUTORISATION_SERVEUR_ABSENTE' };
  }
  return { autorise: true, raison: 'AUTORISE' };
}
