import type { ReponseAutorisationSandbox } from '@/lib/autorisationSandboxMarchand';
import type { ManifestPartenaireMarchand } from '@/lib/manifestPartenaireMarchand';

export const MANIFEST_SANDBOX_VALIDE: ManifestPartenaireMarchand = {
  enseigne: 'coop',
  environnement: 'sandbox',
  region: 'CH',
  versionApi: 'v1',
  baseUrl: 'https://sandbox.partenaire.example',
  accordPartenaireId: 'ACCORD_COOP_2026',
  capacites: {
    panier: true,
    disponibilite: true,
    livraison: true,
    commandeSandbox: true,
  },
};

export const REPONSE_AUTORISATION_VALIDE: ReponseAutorisationSandbox = {
  decision: 'autorisee',
  environnement: 'sandbox',
  audience: 'coursia-connecteur-sandbox',
  enseigne: 'coop',
  emiseLe: '2026-08-19T12:00:00.000Z',
  expireLe: '2026-08-19T12:10:00.000Z',
  jetonOpaque: 'jeton-sandbox-opaque-1234567890-abcdef',
};
