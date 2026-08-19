import type { Enseigne } from '@/types';

export interface ManifestPartenaireMarchand {
  enseigne: Enseigne;
  environnement: 'sandbox';
  region: 'CH';
  versionApi: string;
  baseUrl: string;
  accordPartenaireId: string;
  capacites: {
    panier: boolean;
    disponibilite: boolean;
    livraison: boolean;
    commandeSandbox: boolean;
  };
}

export type BlocageManifestPartenaire =
  | 'URL_HTTPS_REQUISE'
  | 'VERSION_API_INVALIDE'
  | 'ACCORD_PARTENAIRE_ABSENT'
  | 'CAPACITES_INCOMPLETES';

export function evaluerManifestPartenaire(
  manifest: ManifestPartenaireMarchand,
): BlocageManifestPartenaire[] {
  const blocages: BlocageManifestPartenaire[] = [];
  try {
    const url = new URL(manifest.baseUrl);
    if (url.protocol !== 'https:') blocages.push('URL_HTTPS_REQUISE');
  } catch {
    blocages.push('URL_HTTPS_REQUISE');
  }
  if (!/^v\d+$/.test(manifest.versionApi)) blocages.push('VERSION_API_INVALIDE');
  if (!/^[A-Z0-9][A-Z0-9_-]{5,63}$/.test(manifest.accordPartenaireId)) {
    blocages.push('ACCORD_PARTENAIRE_ABSENT');
  }
  if (
    !manifest.capacites.panier ||
    !manifest.capacites.disponibilite ||
    !manifest.capacites.livraison ||
    !manifest.capacites.commandeSandbox
  ) {
    blocages.push('CAPACITES_INCOMPLETES');
  }
  return blocages;
}
