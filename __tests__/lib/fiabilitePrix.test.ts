import { evaluerFraicheurPrix } from '@/lib/fiabilitePrix';

describe('fiabilitePrix', () => {
  const maintenant = new Date('2026-08-19T12:00:00.000Z');
  it.each([
    ['2026-08-19T11:31:00.000Z', 'frais'],
    ['2026-08-19T11:30:00.000Z', 'a_verifier'],
    ['2026-08-18T12:01:00.000Z', 'a_verifier'],
    ['2026-08-18T12:00:00.000Z', 'ancien'],
    ['invalide', 'ancien'],
    ['2026-08-20T12:00:00.000Z', 'ancien'],
  ])('classe %s comme %s', (date, statut) => {
    expect(evaluerFraicheurPrix(date, maintenant).statut).toBe(statut);
  });
});
