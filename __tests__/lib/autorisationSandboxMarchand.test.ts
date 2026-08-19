import {
  DUREE_MAX_AUTORISATION_SANDBOX_MS,
  estAutorisationSandboxActive,
  validerAutorisationSandbox,
  type ReponseAutorisationSandbox,
} from '@/lib/autorisationSandboxMarchand';
import { REPONSE_AUTORISATION_VALIDE } from '@/test-utils/connecteurSandbox';

describe('autorisationSandboxMarchand', () => {
  it('valide une autorisation courte pour la bonne enseigne', () => {
    const resultat = validerAutorisationSandbox(
      REPONSE_AUTORISATION_VALIDE,
      'coop',
      new Date('2026-08-19T12:01:00.000Z'),
    );
    expect(resultat.autorisee).toBe(true);
    if (resultat.autorisee) {
      expect(estAutorisationSandboxActive(resultat.autorisation, new Date('2026-08-19T12:09:59.000Z'))).toBe(true);
      expect(estAutorisationSandboxActive(resultat.autorisation, new Date('2026-08-19T12:10:00.000Z'))).toBe(false);
    }
    expect(DUREE_MAX_AUTORISATION_SANDBOX_MS).toBe(900_000);
  });

  it.each([
    [{ ...REPONSE_AUTORISATION_VALIDE, decision: 'refusee' as const }, 'DECISION_REFUSEE'],
    [{ ...REPONSE_AUTORISATION_VALIDE, audience: 'autre-audience' }, 'CONTEXTE_INVALIDE'],
    [{ ...REPONSE_AUTORISATION_VALIDE, enseigne: 'migros' as const }, 'ENSEIGNE_INCORRECTE'],
    [{ ...REPONSE_AUTORISATION_VALIDE, expireLe: 'date-invalide' }, 'HORODATAGE_INVALIDE'],
    [{ ...REPONSE_AUTORISATION_VALIDE, expireLe: '2026-08-19T12:00:30.000Z' }, 'AUTORISATION_EXPIREE'],
    [{ ...REPONSE_AUTORISATION_VALIDE, expireLe: '2026-08-19T12:30:00.000Z' }, 'DUREE_TROP_LONGUE'],
    [{ ...REPONSE_AUTORISATION_VALIDE, jetonOpaque: 'trop court' }, 'JETON_INVALIDE'],
  ])('refuse une preuve non sûre : %s', (reponse, raison) => {
    expect(
      validerAutorisationSandbox(
        reponse as ReponseAutorisationSandbox,
        'coop',
        new Date('2026-08-19T12:01:00.000Z'),
      ),
    ).toEqual({ autorisee: false, raison });
  });
});
