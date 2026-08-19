import type { RapportConformiteConnecteur } from '@/lib/conformiteConnecteurMarchand';
import type { ResultatAutorisationSandbox } from '@/lib/autorisationSandboxMarchand';
import {
  evaluerManifestPartenaire,
  type ManifestPartenaireMarchand,
} from '@/lib/manifestPartenaireMarchand';

export type BlocagePreparationPartenaire =
  | `MANIFEST:${string}`
  | 'AUTORISATION_SANDBOX_ABSENTE'
  | 'CONFORMITE_CONNECTEUR_EN_ECHEC'
  | 'REVUE_SECURITE_REQUISE'
  | 'VALIDATION_JURIDIQUE_REQUISE';

export interface RapportPreparationPartenaire {
  pretPourSandbox: boolean;
  pretPourProduction: false;
  blocages: BlocagePreparationPartenaire[];
}

/** Un rapport vert ouvre seulement une sandbox; il ne peut jamais autoriser la production. */
export function evaluerPreparationPartenaire(params: {
  manifest: ManifestPartenaireMarchand;
  autorisation: ResultatAutorisationSandbox;
  conformite: RapportConformiteConnecteur;
  revueSecuriteValidee: boolean;
  validationJuridiqueValidee: boolean;
}): RapportPreparationPartenaire {
  const blocages: BlocagePreparationPartenaire[] = evaluerManifestPartenaire(params.manifest).map(
    (blocage) => `MANIFEST:${blocage}` as const,
  );
  if (!params.autorisation.autorisee) blocages.push('AUTORISATION_SANDBOX_ABSENTE');
  if (!params.conformite.conforme) blocages.push('CONFORMITE_CONNECTEUR_EN_ECHEC');
  if (!params.revueSecuriteValidee) blocages.push('REVUE_SECURITE_REQUISE');
  if (!params.validationJuridiqueValidee) blocages.push('VALIDATION_JURIDIQUE_REQUISE');
  return {
    pretPourSandbox: blocages.length === 0,
    pretPourProduction: false,
    blocages,
  };
}
