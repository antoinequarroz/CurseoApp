import type { Enseigne } from '@/types';

const AUTORISATION_SANDBOX_VALIDEE = Symbol('AUTORISATION_SANDBOX_VALIDEE');
export const DUREE_MAX_AUTORISATION_SANDBOX_MS = 15 * 60 * 1000;

export interface ReponseAutorisationSandbox {
  decision: 'autorisee' | 'refusee';
  environnement: 'sandbox';
  audience: 'coursia-connecteur-sandbox';
  enseigne: Enseigne;
  emiseLe: string;
  expireLe: string;
  jetonOpaque: string;
}

export interface AutorisationSandboxValidee extends ReponseAutorisationSandbox {
  decision: 'autorisee';
  readonly [AUTORISATION_SANDBOX_VALIDEE]: true;
}

export type RefusAutorisationSandbox =
  | 'DECISION_REFUSEE'
  | 'CONTEXTE_INVALIDE'
  | 'ENSEIGNE_INCORRECTE'
  | 'HORODATAGE_INVALIDE'
  | 'AUTORISATION_EXPIREE'
  | 'DUREE_TROP_LONGUE'
  | 'JETON_INVALIDE';

export type ResultatAutorisationSandbox =
  | { autorisee: true; autorisation: AutorisationSandboxValidee }
  | { autorisee: false; raison: RefusAutorisationSandbox };

/**
 * Validation défensive côté app. Le serveur partenaire reste l'unique autorité
 * et doit revérifier le jeton opaque à chaque appel; celui-ci n'est jamais persisté.
 */
export function validerAutorisationSandbox(
  reponse: ReponseAutorisationSandbox,
  enseigneAttendue: Enseigne,
  maintenant: Date = new Date(),
): ResultatAutorisationSandbox {
  if (reponse.decision !== 'autorisee') return { autorisee: false, raison: 'DECISION_REFUSEE' };
  if (
    reponse.environnement !== 'sandbox' ||
    reponse.audience !== 'coursia-connecteur-sandbox'
  ) {
    return { autorisee: false, raison: 'CONTEXTE_INVALIDE' };
  }
  if (reponse.enseigne !== enseigneAttendue) {
    return { autorisee: false, raison: 'ENSEIGNE_INCORRECTE' };
  }
  const emiseMs = Date.parse(reponse.emiseLe);
  const expireMs = Date.parse(reponse.expireLe);
  if (
    !Number.isFinite(emiseMs) ||
    !Number.isFinite(expireMs) ||
    expireMs <= emiseMs ||
    emiseMs > maintenant.getTime()
  ) {
    return { autorisee: false, raison: 'HORODATAGE_INVALIDE' };
  }
  if (expireMs <= maintenant.getTime()) return { autorisee: false, raison: 'AUTORISATION_EXPIREE' };
  if (expireMs - emiseMs > DUREE_MAX_AUTORISATION_SANDBOX_MS) {
    return { autorisee: false, raison: 'DUREE_TROP_LONGUE' };
  }
  if (reponse.jetonOpaque.length < 32 || /\s/.test(reponse.jetonOpaque)) {
    return { autorisee: false, raison: 'JETON_INVALIDE' };
  }
  return {
    autorisee: true,
    autorisation: { ...reponse, decision: 'autorisee', [AUTORISATION_SANDBOX_VALIDEE]: true },
  };
}

export function estAutorisationSandboxValidee(
  valeur: unknown,
): valeur is AutorisationSandboxValidee {
  return (
    typeof valeur === 'object' &&
    valeur !== null &&
    AUTORISATION_SANDBOX_VALIDEE in valeur &&
    (valeur as AutorisationSandboxValidee)[AUTORISATION_SANDBOX_VALIDEE] === true
  );
}

export function estAutorisationSandboxActive(
  autorisation: AutorisationSandboxValidee,
  maintenant: Date = new Date(),
): boolean {
  return Date.parse(autorisation.expireLe) > maintenant.getTime();
}
