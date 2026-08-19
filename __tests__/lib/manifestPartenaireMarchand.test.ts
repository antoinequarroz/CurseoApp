import { evaluerManifestPartenaire } from '@/lib/manifestPartenaireMarchand';
import { MANIFEST_SANDBOX_VALIDE } from '@/test-utils/connecteurSandbox';

describe('manifestPartenaireMarchand', () => {
  it('accepte un manifeste sandbox complet', () => {
    expect(evaluerManifestPartenaire(MANIFEST_SANDBOX_VALIDE)).toEqual([]);
  });

  it('énumère tous les prérequis manquants', () => {
    expect(
      evaluerManifestPartenaire({
        ...MANIFEST_SANDBOX_VALIDE,
        baseUrl: 'http://localhost',
        versionApi: 'latest',
        accordPartenaireId: '',
        capacites: { ...MANIFEST_SANDBOX_VALIDE.capacites, livraison: false },
      }),
    ).toEqual([
      'URL_HTTPS_REQUISE',
      'VERSION_API_INVALIDE',
      'ACCORD_PARTENAIRE_ABSENT',
      'CAPACITES_INCOMPLETES',
    ]);
  });
});
