import { evaluerPreparationPartenaire } from '@/lib/evaluationPreparationPartenaire';
import { validerAutorisationSandbox } from '@/lib/autorisationSandboxMarchand';
import { MANIFEST_SANDBOX_VALIDE, REPONSE_AUTORISATION_VALIDE } from '@/test-utils/connecteurSandbox';

const autorisation = validerAutorisationSandbox(
  REPONSE_AUTORISATION_VALIDE,
  'coop',
  new Date('2026-08-19T12:01:00.000Z'),
);

describe('evaluationPreparationPartenaire', () => {
  it('reste no-go tant que les preuves ne sont pas toutes réunies', () => {
    expect(
      evaluerPreparationPartenaire({
        manifest: { ...MANIFEST_SANDBOX_VALIDE, baseUrl: 'http://insecure.example' },
        autorisation: { autorisee: false, raison: 'DECISION_REFUSEE' },
        conformite: { conforme: false, controles: [] },
        revueSecuriteValidee: false,
        validationJuridiqueValidee: false,
      }),
    ).toEqual({
      pretPourSandbox: false,
      pretPourProduction: false,
      blocages: [
        'MANIFEST:URL_HTTPS_REQUISE',
        'AUTORISATION_SANDBOX_ABSENTE',
        'CONFORMITE_CONNECTEUR_EN_ECHEC',
        'REVUE_SECURITE_REQUISE',
        'VALIDATION_JURIDIQUE_REQUISE',
      ],
    });
  });

  it('autorise seulement la sandbox quand tous les contrôles sont verts', () => {
    expect(
      evaluerPreparationPartenaire({
        manifest: MANIFEST_SANDBOX_VALIDE,
        autorisation,
        conformite: { conforme: true, controles: [] },
        revueSecuriteValidee: true,
        validationJuridiqueValidee: true,
      }),
    ).toEqual({ pretPourSandbox: true, pretPourProduction: false, blocages: [] });
  });
});
