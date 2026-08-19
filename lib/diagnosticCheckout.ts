import type { EtatOrchestrationEnseigne } from '@/lib/orchestrateurCommandeDemo';

const CODES_SURS = new Set([
  'ERREUR_TEMPORAIRE',
  'TIMEOUT',
  'RATE_LIMIT',
  'RESEAU_INDISPONIBLE',
  'ENSEIGNE_NON_AUTORISEE',
  'CONNECTEUR_DEMO_INVALIDE',
  'PANIER_PARTIEL',
  'SUBSTITUTION_NON_RESOLUE',
  'TRANSMISSION_INTERDITE_EN_DEMO',
  'TRANSITION_INVALIDE',
  'ERREUR_INCONNUE',
]);

export type ActionRepriseCheckout = 'relancer' | 'corriger_panier';

export interface DiagnosticCheckoutSain {
  reference: `CHK-${string}`;
  codes: string[];
  nombreEnseignes: number;
  tentativeMax: number;
  action: ActionRepriseCheckout;
}

/** Les messages libres d'un fournisseur ne doivent jamais atteindre Sentry ou l'interface. */
export function normaliserCodeErreurCheckout(code: string): string {
  return CODES_SURS.has(code) ? code : 'ERREUR_INCONNUE';
}

export function determinerActionRepriseCheckout(
  etats: readonly EtatOrchestrationEnseigne[],
): ActionRepriseCheckout {
  return etats.some((etat) => ['partiel', 'indisponible'].includes(etat.statut))
    ? 'corriger_panier'
    : 'relancer';
}

function empreinteCourte(valeur: string): string {
  let empreinte = 2166136261;
  for (let index = 0; index < valeur.length; index += 1) {
    empreinte ^= valeur.charCodeAt(index);
    empreinte = Math.imul(empreinte, 16777619);
  }
  return (empreinte >>> 0).toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
}

export function creerDiagnosticCheckout(
  etats: readonly EtatOrchestrationEnseigne[],
  maintenant: Date = new Date(),
): DiagnosticCheckoutSain {
  const codes = [...new Set(etats.map((etat) => normaliserCodeErreurCheckout(etat.code ?? 'ERREUR_INCONNUE')))]
    .sort();
  const jour = maintenant.toISOString().slice(2, 10).replace(/-/g, '');
  const empreinte = empreinteCourte(`${jour}:${codes.join(':')}:${etats.length}`);
  return {
    reference: `CHK-${jour}-${empreinte}`,
    codes,
    nombreEnseignes: etats.length,
    tentativeMax: Math.max(0, ...etats.map((etat) => etat.tentative)),
    action: determinerActionRepriseCheckout(etats),
  };
}
